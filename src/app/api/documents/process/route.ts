export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from '@/lib/ai/auth-helper'
import { getSupabaseServer } from '@/lib/supabase/server'
import { ENV } from '@/lib/constants/env'
import { STORAGE_BUCKET } from '@/lib/constants/app'
import { logger, captureError } from '@/lib/analytics'

const MAX_PDF_PAGES = 20
const MAX_TEXT_CHARS = 12000
const MAX_IMAGE_SIZE_MB = 5

interface ProcessedPDF {
  type: 'pdf'
  text: string
  pageCount: number
  truncated: boolean
  charCount: number
}

interface ProcessedImage {
  type: 'image'
  base64: string
  mediaType: string
  sizeKB: number
  resized: boolean
}

// service role client for storage (bypasses RLS)
// ownership is verified via the DB check below before using this
function getStorageAdmin() {
  return createClient(ENV.supabase.url, ENV.supabase.serviceRoleKey, {
    auth: { persistSession: false },
  })
}

export async function POST(req: NextRequest) {
  const { userId, errorResponse } = await getAuthenticatedUser()
  if (!userId) return errorResponse!

  const body = (await req.json()) as {
    mimeType?: string
    documentId?: string
  }
  const { mimeType, documentId } = body

  if (!documentId || !mimeType) {
    return NextResponse.json({ error: 'documentId and mimeType required' }, { status: 400 })
  }

  // Always verify document ownership and retrieve file_path from the DB —
  // never trust a caller-supplied file path.
  const supabase = await getSupabaseServer()
  const { data: doc } = await supabase
    .from('documents')
    .select('id, file_path, mime_type')
    .eq('id', documentId)
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .single()

  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  // Use the server-side file_path from the DB, not any caller-supplied value.
  const filePath: string = doc.file_path

  try {
    // use service role client to create signed URL (bypasses storage RLS)
    const admin = getStorageAdmin()
    const { data: signedData, error: signedError } = await admin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(filePath, 300)

    if (signedError || !signedData?.signedUrl) {
      logger.error({ signedError, filePath }, 'Failed to create signed URL')
      return NextResponse.json(
        { error: 'Could not access file', detail: signedError?.message },
        { status: 404 },
      )
    }

    const fileResponse = await fetch(signedData.signedUrl)
    if (!fileResponse.ok) {
      throw new Error('Failed to fetch file from storage: HTTP ' + fileResponse.status)
    }

    if (mimeType === 'application/pdf') {
      const result = await processPDF(fileResponse)
      return NextResponse.json(result)
    }

    if (mimeType.startsWith('image/')) {
      const result = await processImage(fileResponse, mimeType)
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    captureError(err, { feature: 'document-processing', filePath, mimeType })
    logger.error({ err, errorMessage, filePath, mimeType }, 'Document processing failed')
    return NextResponse.json(
      { error: 'Failed to process document. Please try again.', detail: errorMessage },
      { status: 500 },
    )
  }
}

async function processPDF(response: Response): Promise<ProcessedPDF> {
  const arrayBuffer = await response.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)

  // try legacy build first (better node.js compatibility), fall back to standard
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs').catch(() => import('pdfjs-dist'))

  // disable browser worker (not available in node.js)
  pdfjs.GlobalWorkerOptions.workerSrc = ''

  const pdf = await pdfjs
    .getDocument({
      data: uint8Array,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
      disableFontFace: true,
    })
    .promise

  const totalPages = pdf.numPages
  const pagesToProcess = Math.min(totalPages, MAX_PDF_PAGES)
  let fullText = ''

  for (let i = 1; i <= pagesToProcess; i++) {
    try {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()

      const pageText = textContent.items
        .filter(
          (item: unknown) =>
            item !== null && typeof item === 'object' && 'str' in (item as object),
        )
        .map((item: unknown) => (item as { str: string }).str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()

      if (pageText) {
        fullText += `\n[Page ${i}]\n${pageText}\n`
      }
    } catch (pageErr) {
      logger.warn({ page: i, pageErr }, 'Could not extract page text')
    }
  }

  fullText = fullText.trim()
  const truncated = fullText.length > MAX_TEXT_CHARS

  if (truncated) {
    fullText =
      fullText.slice(0, MAX_TEXT_CHARS) +
      `\n\n[Document truncated. Showing first ${MAX_TEXT_CHARS} characters of ${totalPages} pages]`
  }

  return {
    type: 'pdf',
    text: fullText || '[No readable text found in PDF. This may be a scanned document.]',
    pageCount: totalPages,
    truncated,
    charCount: Math.min(fullText.length, MAX_TEXT_CHARS),
  }
}

async function processImage(response: Response, mimeType: string): Promise<ProcessedImage> {
  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  if (buffer.length > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    throw new Error(`Image too large. Maximum size is ${MAX_IMAGE_SIZE_MB}MB.`)
  }

  const supported = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

  return {
    type: 'image',
    base64: buffer.toString('base64'),
    mediaType: supported.includes(mimeType) ? mimeType : 'image/jpeg',
    sizeKB: Math.round(buffer.length / 1024),
    resized: false,
  }
}

'use client'

// client-side processing for newly uploaded files (file objects)
// existing supabase documents go through /api/documents/process instead

import { configurePDFWorker } from '@/lib/pdf/worker'

const MAX_TEXT_CHARS = 12000
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
const MAX_IMAGE_DIMENSION = 1568

export interface ProcessedDocument {
  type: 'pdf' | 'image'
  fileName: string
  mimeType: string

  // PDF result
  text?: string
  pageCount?: number
  truncated?: boolean

  // image result
  base64?: string
  mediaType?: string
  sizeKB?: number
}

export async function processUploadedFile(file: File): Promise<ProcessedDocument> {
  if (file.type === 'application/pdf') {
    return processPDFFile(file)
  }
  if (file.type.startsWith('image/')) {
    return processImageFile(file)
  }
  throw new Error('Unsupported file type: ' + file.type)
}

async function processPDFFile(file: File): Promise<ProcessedDocument> {
  configurePDFWorker()

  const pdfjsLib = await import('pdfjs-dist')
  const arrayBuffer = await file.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)

  const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise

  const totalPages = pdf.numPages
  let fullText = ''

  for (let i = 1; i <= Math.min(totalPages, 20); i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ('str' in item ? (item as { str: string }).str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (pageText) {
      fullText += `\n[Page ${i}]\n${pageText}\n`
    }
  }

  fullText = fullText.trim()
  const truncated = fullText.length > MAX_TEXT_CHARS

  return {
    type: 'pdf',
    fileName: file.name,
    mimeType: file.type,
    text: truncated
      ? fullText.slice(0, MAX_TEXT_CHARS) + '\n\n[Truncated...]'
      : fullText || '[No readable text]',
    pageCount: totalPages,
    truncated,
  }
}

async function processImageFile(file: File): Promise<ProcessedDocument> {
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error('Image too large. Max 5MB.')
  }

  const resizedBase64 = await resizeImageToBase64(file, MAX_IMAGE_DIMENSION)
  const sizeKB = Math.round(resizedBase64.length / 1024)

  return {
    type: 'image',
    fileName: file.name,
    mimeType: file.type,
    base64: resizedBase64,
    mediaType: file.type,
    sizeKB,
  }
}

function resizeImageToBase64(file: File, maxDimension: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      let { width, height } = img

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width)
          width = maxDimension
        } else {
          width = Math.round((width * maxDimension) / height)
          height = maxDimension
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas not supported'))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      const dataUrl = canvas.toDataURL(
        file.type === 'image/png' ? 'image/png' : 'image/jpeg',
        0.85,
      )

      // strip data:image/...;base64, prefix (gemini needs raw base64 only)
      const base64 = dataUrl.split(',')[1]
      if (!base64) {
        reject(new Error('Failed to encode image'))
        return
      }
      resolve(base64)
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { genAI, AI_MODEL, TOKEN_LIMITS } from '@/lib/ai/gemini'
import { SYSTEM_PROMPTS } from '@/lib/ai/prompts'
import { canUseFeature, deductCredits } from '@/lib/credits/credits'
import { createSSEStream } from '@/lib/ai/stream-helpers'
import { getAuthenticatedUser } from '@/lib/ai/auth-helper'
import { logger } from '@/lib/utils/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { userId, errorResponse } = await getAuthenticatedUser()
  if (!userId) return errorResponse!
  const uid: string = userId

  const creditCheck = await canUseFeature(uid, 'case-summary')
  if (!creditCheck.allowed) {
    return NextResponse.json(
      {
        error: 'Insufficient credits',
        balance: creditCheck.balance,
        cost: creditCheck.cost,
        code: 'INSUFFICIENT_CREDITS',
      },
      { status: 402 },
    )
  }

  const body = await req.json()
  const {
    caseNumber,
    title,
    clientName,
    caseType,
    status,
    courtName,
    judgeName,
    opposingParty,
    description,
    notes,
  } = body

  if (!title || !clientName) {
    return NextResponse.json({ error: 'title and clientName required' }, { status: 400 })
  }

  const userMessage = `
Please generate a case summary for:

Case Number: ${caseNumber ?? 'Not assigned'}
Case Title: ${title}
Case Type: ${caseType}
Status: ${status}
Client: ${clientName}
Opposing Party: ${opposingParty ?? 'Not specified'}
Court: ${courtName ?? 'Not specified'}
Judge: ${judgeName ?? 'Not specified'}

Description:
${description ?? 'No description provided'}

Notes:
${notes ?? 'No notes provided'}
  `.trim()

  logger.info({ userId: uid, feature: 'case-summary' }, 'AI case summary requested')

  async function* generate() {
    try {
      const model = genAI.getGenerativeModel({
        model: AI_MODEL,
        systemInstruction: SYSTEM_PROMPTS.caseSummary,
        generationConfig: { maxOutputTokens: TOKEN_LIMITS.caseSummary },
      })
      const result = await model.generateContentStream(userMessage)

      for await (const chunk of result.stream) {
        yield chunk.text()
      }

      await deductCredits(uid, 'case-summary', 'AI: case summary')
    } catch (err) {
      logger.error({ err, userId: uid }, 'AI case summary failed')
      yield '\n\nLawket AI assistant is unavailable. Please try again.'
    }
  }

  return createSSEStream(generate())
}

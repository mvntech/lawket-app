import { NextRequest, NextResponse } from 'next/server'
import { genAI, AI_MODEL, TOKEN_LIMITS } from '@/lib/ai/gemini'
import { SYSTEM_PROMPTS } from '@/lib/ai/prompts'
import { canUseFeature, deductCredits } from '@/lib/credits/credits'
import { createSSEStream } from '@/lib/ai/stream-helpers'
import { getAuthenticatedUser } from '@/lib/ai/auth-helper'
import { checkRateLimit, trackUsage } from '@/lib/ai/rate-limiter'
import { caseSummarySchema } from '@/lib/validations/ai.schema'
import { logger } from '@/lib/utils/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { userId, errorResponse } = await getAuthenticatedUser()
  if (!userId) return errorResponse!
  const uid: string = userId

  const raw = await req.json()
  const parsed = caseSummarySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const rateCheck = await checkRateLimit(uid)
  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: "You've reached today's AI limit. Resets tomorrow.",
        resetAt: rateCheck.resetAt,
      },
      { status: 429 },
    )
  }

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
  } = parsed.data

  const userMessage = `
Please generate a case summary for:

Case Number: ${caseNumber ?? 'Not assigned'}
Case Title: ${title}
Case Type: ${caseType ?? 'Not specified'}
Status: ${status ?? 'Not specified'}
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

      await Promise.all([
        deductCredits(uid, 'case-summary', 'AI: case summary'),
        trackUsage(uid, 'case-summary', TOKEN_LIMITS.caseSummary),
      ])
    } catch (err) {
      logger.error({ err, userId: uid }, 'AI case summary failed')
      yield '\n\nLawket AI assistant is unavailable. Please try again.'
    }
  }

  return createSSEStream(generate())
}

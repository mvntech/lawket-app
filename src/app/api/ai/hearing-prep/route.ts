import { NextRequest, NextResponse } from 'next/server'
import { genAI, AI_MODEL, TOKEN_LIMITS } from '@/lib/ai/gemini'
import { SYSTEM_PROMPTS } from '@/lib/ai/prompts'
import { canUseFeature, deductCredits } from '@/lib/credits/credits'
import { createSSEStream } from '@/lib/ai/stream-helpers'
import { getAuthenticatedUser } from '@/lib/ai/auth-helper'
import { checkRateLimit, trackUsage } from '@/lib/ai/rate-limiter'
import { hearingPrepSchema } from '@/lib/validations/ai.schema'
import { logger } from '@/lib/utils/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { userId, errorResponse } = await getAuthenticatedUser()
  if (!userId) return errorResponse!
  const uid: string = userId

  const raw = await req.json()
  const parsed = hearingPrepSchema.safeParse(raw)
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

  const creditCheck = await canUseFeature(uid, 'hearing-prep')
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
    hearingTitle,
    hearingDate,
    hearingTime,
    courtName,
    judgeName,
    caseTitle,
    caseType,
    clientName,
    opposingParty,
    caseDescription,
    caseNotes,
    previousHearings,
  } = parsed.data

  const prevHearingsText =
    Array.isArray(previousHearings) && previousHearings.length > 0
      ? previousHearings.join(', ')
      : 'First hearing'

  const userMessage = `
Prepare me for this upcoming hearing:

Case: ${caseTitle}
Case Type: ${caseType ?? 'Not specified'}
Client: ${clientName ?? 'Not specified'}
Opposing Party: ${opposingParty ?? 'Not specified'}

Hearing Details:
Title: ${hearingTitle}
Date: ${hearingDate}
Time: ${hearingTime ?? 'TBC'}
Court: ${courtName ?? 'Not specified'}
Judge: ${judgeName ?? 'Not specified'}

Case Background:
${caseDescription ?? 'No description provided'}

Previous Hearings:
${prevHearingsText}

Notes:
${caseNotes ?? 'No notes provided'}
  `.trim()

  logger.info({ userId: uid, feature: 'hearing-prep' }, 'AI hearing prep requested')

  async function* generate() {
    try {
      const model = genAI.getGenerativeModel({
        model: AI_MODEL,
        systemInstruction: SYSTEM_PROMPTS.hearingPrep,
        generationConfig: { maxOutputTokens: TOKEN_LIMITS.hearingPrep },
      })
      const result = await model.generateContentStream(userMessage)

      for await (const chunk of result.stream) {
        yield chunk.text()
      }

      await Promise.all([
        deductCredits(uid, 'hearing-prep', 'AI: hearing prep'),
        trackUsage(uid, 'hearing-prep', TOKEN_LIMITS.hearingPrep),
      ])
    } catch (err) {
      logger.error({ err, userId: uid }, 'AI hearing prep failed')
      yield '\n\nLawket AI assistant is unavailable. Please try again.'
    }
  }

  return createSSEStream(generate())
}

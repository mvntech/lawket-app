import { NextRequest, NextResponse } from 'next/server'
import { genAI, AI_MODEL, TOKEN_LIMITS } from '@/lib/ai/gemini'
import { SYSTEM_PROMPTS } from '@/lib/ai/prompts'
import { canUseFeature, deductCredits } from '@/lib/credits/credits'
import { createSSEStream } from '@/lib/ai/stream-helpers'
import { getAuthenticatedUser } from '@/lib/ai/auth-helper'
import { checkRateLimit, trackUsage } from '@/lib/ai/rate-limiter'
import { cleanNotesSchema } from '@/lib/validations/ai.schema'
import { logger } from '@/lib/utils/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { userId, errorResponse } = await getAuthenticatedUser()
  if (!userId) return errorResponse!
  const uid: string = userId

  const raw = await req.json()
  const parsed = cleanNotesSchema.safeParse(raw)
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

  const creditCheck = await canUseFeature(uid, 'clean-notes')
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

  const { rawNotes, caseTitle } = parsed.data

  const userMessage = `
Clean and organize these case notes:

Case: ${caseTitle ?? 'Not specified'}

Raw Notes:
${rawNotes}
  `.trim()

  logger.info({ userId: uid, feature: 'clean-notes' }, 'AI notes cleanup requested')

  async function* generate() {
    try {
      const model = genAI.getGenerativeModel({
        model: AI_MODEL,
        systemInstruction: SYSTEM_PROMPTS.cleanNotes,
        generationConfig: { maxOutputTokens: TOKEN_LIMITS.cleanNotes },
      })
      const result = await model.generateContentStream(userMessage)

      for await (const chunk of result.stream) {
        yield chunk.text()
      }

      await Promise.all([
        deductCredits(uid, 'clean-notes', 'AI: clean notes'),
        trackUsage(uid, 'clean-notes', TOKEN_LIMITS.cleanNotes),
      ])
    } catch (err) {
      logger.error({ err, userId: uid }, 'AI notes cleanup failed')
      yield '\n\nLawket AI assistant is unavailable. Please try again.'
    }
  }

  return createSSEStream(generate())
}

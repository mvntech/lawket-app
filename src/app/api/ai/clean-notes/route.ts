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

  const body = await req.json()
  const { rawNotes, caseTitle } = body

  if (!rawNotes || rawNotes.length < 10) {
    return NextResponse.json({ error: 'Notes too short' }, { status: 400 })
  }
  if (rawNotes.length > 5000) {
    return NextResponse.json({ error: 'Notes too long (max 5000 chars)' }, { status: 400 })
  }

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

      await deductCredits(uid, 'clean-notes', 'AI: clean notes')
    } catch (err) {
      logger.error({ err, userId: uid }, 'AI notes cleanup failed')
      yield '\n\nLawket AI assistant is unavailable. Please try again.'
    }
  }

  return createSSEStream(generate())
}

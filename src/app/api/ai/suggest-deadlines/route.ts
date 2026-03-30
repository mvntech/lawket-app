import { NextRequest, NextResponse } from 'next/server'
import { genAI, AI_MODEL, TOKEN_LIMITS } from '@/lib/ai/gemini'
import { SYSTEM_PROMPTS } from '@/lib/ai/prompts'
import { canUseFeature, deductCredits } from '@/lib/credits/credits'
import { getAuthenticatedUser } from '@/lib/ai/auth-helper'
import { checkRateLimit, trackUsage } from '@/lib/ai/rate-limiter'
import { suggestDeadlinesSchema, deadlineSuggestionsSchema } from '@/lib/validations/ai.schema'
import { logger } from '@/lib/utils/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { userId, errorResponse } = await getAuthenticatedUser()
  if (!userId) return errorResponse!
  const uid: string = userId

  const raw = await req.json()
  const parsed = suggestDeadlinesSchema.safeParse(raw)
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

  const creditCheck = await canUseFeature(uid, 'suggest-deadlines')
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

  try {
    const { caseType, hearingDate, caseTitle } = parsed.data

    const userMessage = `
Case Type: ${caseType}
Hearing Date: ${hearingDate}
Case: ${caseTitle}

Suggest relevant deadlines a lawyer should set before this hearing.
  `.trim()

    logger.info({ userId: uid, feature: 'suggest-deadlines' }, 'AI deadline suggestions requested')

    const model = genAI.getGenerativeModel({
      model: AI_MODEL,
      systemInstruction: {
        role: 'system',
        parts: [{ text: SYSTEM_PROMPTS.suggestDeadlines }],
      },
      generationConfig: { maxOutputTokens: TOKEN_LIMITS.suggestDeadlines },
    })
    const result = await model.generateContent(userMessage)
    const text = result.response.text()

    let deadlines: Array<{
      title: string
      due_date: string
      priority: string
      description: string
    }> = []

    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const aiParsed = deadlineSuggestionsSchema.safeParse(JSON.parse(jsonMatch[0]))
      if (aiParsed.success) {
        const hearingDateObj = new Date(hearingDate)
        deadlines = aiParsed.data.map((s) => ({
          title: s.title,
          due_date: new Date(
            hearingDateObj.getTime() - s.days_before_hearing * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split('T')[0],
          priority: s.priority,
          description: s.description,
        }))
      } else {
        logger.warn({ userId: uid }, 'AI deadline suggestions failed schema validation')
      }
    }

    await Promise.all([
      deductCredits(uid, 'suggest-deadlines', 'AI: suggest deadlines'),
      trackUsage(uid, 'suggest-deadlines', TOKEN_LIMITS.suggestDeadlines),
    ])

    return NextResponse.json({ deadlines })
  } catch (error) {
    logger.error({ err: error, userId: uid }, 'AI deadline suggestions API failed')
    const message = error instanceof Error ? error.message : 'AI generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

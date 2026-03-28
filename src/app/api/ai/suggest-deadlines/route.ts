import { NextRequest, NextResponse } from 'next/server'
import { genAI, AI_MODEL, TOKEN_LIMITS } from '@/lib/ai/gemini'
import { SYSTEM_PROMPTS } from '@/lib/ai/prompts'
import { canUseFeature, deductCredits } from '@/lib/credits/credits'
import { getAuthenticatedUser } from '@/lib/ai/auth-helper'
import { logger } from '@/lib/utils/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { userId, errorResponse } = await getAuthenticatedUser()
  if (!userId) return errorResponse!
  const uid: string = userId

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

  const body = await req.json()
  const { caseType, hearingDate, caseTitle } = body

  if (!caseType || !hearingDate || !caseTitle) {
    return NextResponse.json(
      { error: 'caseType, hearingDate, and caseTitle required' },
      { status: 400 },
    )
  }

  const userMessage = `
Case Type: ${caseType}
Hearing Date: ${hearingDate}
Case: ${caseTitle}

Suggest relevant deadlines a lawyer should set before this hearing.
  `.trim()

  logger.info({ userId: uid, feature: 'suggest-deadlines' }, 'AI deadline suggestions requested')

  const model = genAI.getGenerativeModel({
    model: AI_MODEL,
    systemInstruction: SYSTEM_PROMPTS.suggestDeadlines,
    generationConfig: { maxOutputTokens: TOKEN_LIMITS.suggestDeadlines },
  })
  const result = await model.generateContent(userMessage)
  const text = result.response.text()

  interface DeadlineSuggestion {
    title: string
    days_before_hearing: number
    priority: string
    description: string
  }

  let suggestions: DeadlineSuggestion[] = []
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      suggestions = JSON.parse(jsonMatch[0])
    }
  } catch {
    suggestions = []
  }

  const hearingDateObj = new Date(hearingDate)
  const deadlines = suggestions.map((s) => ({
    title: s.title,
    due_date: new Date(
      hearingDateObj.getTime() - s.days_before_hearing * 24 * 60 * 60 * 1000,
    )
      .toISOString()
      .split('T')[0],
    priority: s.priority,
    description: s.description,
  }))

  await deductCredits(uid, 'suggest-deadlines', 'AI: suggest deadlines')

  return NextResponse.json({ deadlines })
}

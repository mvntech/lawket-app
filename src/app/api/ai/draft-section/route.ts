import { NextRequest, NextResponse } from 'next/server'
import { genAI, AI_MODEL, TOKEN_LIMITS } from '@/lib/ai/gemini'
import { SYSTEM_PROMPTS } from '@/lib/ai/prompts'
import { canUseFeature, deductCredits } from '@/lib/credits/credits'
import { createSSEStream } from '@/lib/ai/stream-helpers'
import { getAuthenticatedUser } from '@/lib/ai/auth-helper'
import { logger } from '@/lib/utils/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_SECTION_TYPES = [
  'petition_intro',
  'relief_sought',
  'facts',
  'legal_arguments',
  'application',
  'cover_letter',
] as const

type SectionType = (typeof VALID_SECTION_TYPES)[number]

export async function POST(req: NextRequest) {
  const { userId, errorResponse } = await getAuthenticatedUser()
  if (!userId) return errorResponse!
  const uid: string = userId

  const creditCheck = await canUseFeature(uid, 'draft-section')
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
  const { sectionType, caseContext } = body

  if (!sectionType || !VALID_SECTION_TYPES.includes(sectionType as SectionType)) {
    return NextResponse.json({ error: 'Invalid sectionType' }, { status: 400 })
  }
  if (!caseContext) {
    return NextResponse.json({ error: 'caseContext required' }, { status: 400 })
  }

  const userMessage = `
Draft the ${sectionType} section for:

${caseContext}
  `.trim()

  logger.info({ userId: uid, feature: 'draft-section', sectionType }, 'AI draft section requested')

  async function* generate() {
    try {
      const model = genAI.getGenerativeModel({
        model: AI_MODEL,
        systemInstruction: SYSTEM_PROMPTS.draftSection,
        generationConfig: { maxOutputTokens: TOKEN_LIMITS.draftSection },
      })
      const result = await model.generateContentStream(userMessage)

      for await (const chunk of result.stream) {
        yield chunk.text()
      }

      await deductCredits(uid, 'draft-section', 'AI: draft section')
    } catch (err) {
      logger.error({ err, userId: uid }, 'AI draft section failed')
      yield '\n\nLawket AI assistant is unavailable. Please try again.'
    }
  }

  return createSSEStream(generate())
}

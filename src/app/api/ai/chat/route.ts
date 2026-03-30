export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/ai/auth-helper'
import { canUseAIFeature, deductCredits } from '@/lib/ai/credits'
import { getOrCreateConversation, saveMessage, getMessages } from '@/lib/ai/message-store'
import { buildCaseContext, buildSystemPrompt, buildGeneralSystemPrompt, buildPromptMessage } from '@/lib/ai/chat-context'
import { createSSEStream } from '@/lib/ai/stream-helpers'
import { genAI, AI_MODEL } from '@/lib/ai/gemini'
import { PROMPT_CREDIT_COSTS } from '@/lib/ai/types'
import { checkRateLimit, trackUsage } from '@/lib/ai/rate-limiter'
import { chatSchema } from '@/lib/validations/ai.schema'
import type { Part } from '@google/generative-ai'
import type { Content } from '@google/generative-ai'
import { getSupabaseServer } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const { userId, errorResponse } = await getAuthenticatedUser()
  if (errorResponse) return errorResponse

  const raw = await request.json()
  const parsed = chatSchema.safeParse(raw)
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Invalid request', details: parsed.error.issues }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const {
    caseId,
    message,
    messageType = 'text',
    promptType,
    documentContext,
    documentName,
    imageBase64,
    imageMediaType,
  } = parsed.data

  const rateCheck = await checkRateLimit(userId!)
  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({
        error: "You've reached today's AI limit. Resets tomorrow.",
        resetAt: rateCheck.resetAt,
      }),
      { status: 429, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // For case-scoped conversations, verify ownership before touching credits or conversations.
  if (caseId !== 'general') {
    const supabase = await getSupabaseServer()
    const { data: caseRow } = await supabase
      .from('cases')
      .select('id')
      .eq('id', caseId)
      .eq('user_id', userId!)
      .eq('is_deleted', false)
      .single()

    if (!caseRow) {
      return new Response(JSON.stringify({ error: 'Case not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  const cost = promptType ? (PROMPT_CREDIT_COSTS[promptType] ?? 1) : 1

  const { allowed, balance } = await canUseAIFeature(userId!, 'chat')
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Rate limit reached' }), {
      status: 402,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const convId = await getOrCreateConversation(caseId, userId!)

  let systemPrompt: string
  let context: Awaited<ReturnType<typeof buildCaseContext>> | null = null
  if (caseId === 'general') {
    systemPrompt = buildGeneralSystemPrompt()
  } else {
    context = await buildCaseContext(caseId, userId!, convId)
    systemPrompt = buildSystemPrompt(context)
  }

  if (imageBase64) {
    systemPrompt +=
      '\n\nThe user has shared an image. Analyze it carefully in the context of their legal case.'
  } else if (documentContext) {
    systemPrompt +=
      '\n\nThe user has shared a document. The extracted text is included in their message. Analyze it carefully.'
  }

  type AllowedImageMimeType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'image/heic' | 'image/heif'

  let userParts: Part[]

  if (imageBase64 && imageMediaType) {
    userParts = [
      {
        inlineData: {
          mimeType: imageMediaType as AllowedImageMimeType,
          data: imageBase64,
        },
      },
      { text: message || 'Please analyze this image.' },
    ]
  } else if (promptType && context) {
    const promptContent = buildPromptMessage(promptType, context, documentContext)
    userParts = [{ text: promptContent }]
  } else if (documentContext) {
    userParts = [{ text: message + '\n\n---\nDOCUMENT CONTENT:\n' + documentContext + '\n---' }]
  } else {
    userParts = [{ text: message }]
  }

  const latestUserMsgId = await saveMessage(convId, 'user', message, messageType, {
    promptLabel: promptType,
    documentName,
  })

  const allMessages = await getMessages(convId)

  const history: Content[] = []
  for (const msg of allMessages.slice(0, -1)) {
    history.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    })
  }

  async function* generate() {
    let fullResponse = ''
    try {
      const model = genAI.getGenerativeModel({
        model: AI_MODEL,
        systemInstruction: systemPrompt,
        generationConfig: { maxOutputTokens: 1500 },
      })

      const chat = model.startChat({ history })
      const result = await chat.sendMessageStream(userParts)

      for await (const chunk of result.stream) {
        const text = chunk.text()
        if (text) {
          fullResponse += text
          yield text
        }
      }

      await saveMessage(convId, 'assistant', fullResponse, 'text', { creditsUsed: cost }, cost)
      await Promise.all([
        deductCredits(userId!, 'chat', `AI chat: ${promptType ?? 'message'}`),
        trackUsage(userId!, 'chat', fullResponse.length),
      ])

      yield '\n[META]' +
        JSON.stringify({
          conversationId: convId,
          creditsUsed: cost,
          remainingBalance: balance - cost,
          messageId: latestUserMsgId,
        })
    } catch (err) {
      yield `Error: ${err instanceof Error ? err.message : 'AI request failed'}`
    }
  }

  return createSSEStream(generate())
}

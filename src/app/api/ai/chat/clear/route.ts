export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { getAuthenticatedUser } from '@/lib/ai/auth-helper'
import { getSupabaseServer } from '@/lib/supabase/server'
import { clearConversation } from '@/lib/ai/message-store'

export async function POST(request: NextRequest) {
  const { userId, errorResponse } = await getAuthenticatedUser()
  if (errorResponse) return errorResponse

  const { conversationId } = (await request.json()) as { conversationId: string }
  if (!conversationId) {
    return new Response(JSON.stringify({ error: 'conversationId required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = await getSupabaseServer()
  const { data } = await (supabase as any)
    .from('ai_conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('user_id', userId)
    .single()

  if (!data) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  await clearConversation(conversationId)

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
}

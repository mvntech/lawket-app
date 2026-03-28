export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { getAuthenticatedUser } from '@/lib/ai/auth-helper'
import { getOrCreateConversation, getMessages } from '@/lib/ai/message-store'
import { getSupabaseServer } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { userId, errorResponse } = await getAuthenticatedUser()
  if (errorResponse) return errorResponse

  const caseId = request.nextUrl.searchParams.get('caseId')
  if (!caseId) {
    return new Response(JSON.stringify({ error: 'caseId required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // For case-scoped conversations, verify ownership before exposing data.
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

  const conversationId = await getOrCreateConversation(caseId, userId!)
  const messages = await getMessages(conversationId)

  return new Response(JSON.stringify({ conversationId, messages }), {
    headers: { 'Content-Type': 'application/json' },
  })
}

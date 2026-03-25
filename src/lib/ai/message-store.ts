import { getSupabaseServer } from '@/lib/supabase/server'
import type { ChatMessage, MessageRole, MessageType } from '@/lib/ai/types'

// ai_conversations and ai_messages are new tables not yet in generated types

type AnySupabase = any

export async function getOrCreateConversation(caseId: string, userId: string): Promise<string> {
  const supabase = (await getSupabaseServer()) as AnySupabase

  const { data: existing } = await supabase
    .from('ai_conversations')
    .select('id')
    .eq('case_id', caseId)
    .eq('user_id', userId)
    .single()

  if (existing) return existing.id as string

  const { data: created, error } = await supabase
    .from('ai_conversations')
    .insert({ case_id: caseId, user_id: userId })
    .select('id')
    .single()

  if (error || !created) throw new Error('Failed to create conversation')
  return (created as { id: string }).id
}

export async function saveMessage(
  conversationId: string,
  role: MessageRole,
  content: string,
  type: MessageType,
  metadata?: object,
  creditsUsed?: number,
): Promise<string> {
  const supabase = (await getSupabaseServer()) as AnySupabase

  const { data, error } = await supabase
    .from('ai_messages')
    .insert({
      conversation_id: conversationId,
      role,
      content,
      type,
      metadata: metadata ?? null,
      credits_used: creditsUsed ?? 0,
    })
    .select('id')
    .single()

  if (error || !data) throw new Error('Failed to save message')

  await supabase
    .from('ai_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId)

  return (data as { id: string }).id
}

export async function getMessages(conversationId: string, limit = 50): Promise<ChatMessage[]> {
  const supabase = (await getSupabaseServer()) as AnySupabase

  const { data } = await supabase
    .from('ai_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit)

  return ((data as any[]) ?? []).map((m) => ({
    id: m.id as string,
    conversationId: m.conversation_id as string,
    role: m.role as MessageRole,
    content: m.content as string,
    type: (m.type ?? 'text') as MessageType,
    metadata: (m.metadata as ChatMessage['metadata']) ?? undefined,
    createdAt: m.created_at as string,
  }))
}

export async function clearConversation(conversationId: string): Promise<void> {
  const supabase = (await getSupabaseServer()) as AnySupabase
  await supabase.from('ai_messages').delete().eq('conversation_id', conversationId)
}

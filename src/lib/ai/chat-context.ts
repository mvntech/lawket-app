import { getSupabaseServer } from '@/lib/supabase/server'

interface CaseContext {
  caseDetails: string
  upcomingHearings: string
  deadlines: string
  documents: string
  recentMessages: string
}

interface CaseRow {
  title: string
  case_number: string
  case_type: string
  status: string
  client_name: string
  client_contact: string | null
  opposing_party: string | null
  court_name: string | null
  judge_name: string | null
  filed_date: string | null
  description: string | null
  notes: string | null
}

interface HearingRow {
  title: string
  hearing_date: string
  hearing_time: string | null
  court_name: string | null
}

interface DeadlineRow {
  title: string
  due_date: string
  priority: string
}

interface DocumentRow {
  id: string
  name: string
  doc_type: string
  created_at: string
}

interface MessageRow {
  role: string
  content: string
  type: string
}

export async function buildCaseContext(
  caseId: string,
  userId: string,
  conversationId?: string,
): Promise<CaseContext> {
  const supabase = (await getSupabaseServer()) as any

  const [caseResult, hearingsResult, deadlinesResult, documentsResult, messagesResult] =
    await Promise.all([
      supabase
        .from('cases')
        .select('*')
        .eq('id', caseId)
        .eq('user_id', userId)
        .single() as Promise<{ data: CaseRow | null }>,
      supabase
        .from('hearings')
        .select('*')
        .eq('case_id', caseId)
        .eq('is_deleted', false)
        .gte('hearing_date', new Date().toISOString().split('T')[0])
        .order('hearing_date', { ascending: true })
        .limit(3) as Promise<{ data: HearingRow[] | null }>,
      supabase
        .from('deadlines')
        .select('*')
        .eq('case_id', caseId)
        .eq('is_completed', false)
        .eq('is_deleted', false)
        .order('due_date', { ascending: true })
        .limit(5) as Promise<{ data: DeadlineRow[] | null }>,
      supabase
        .from('documents')
        .select('id, name, doc_type, created_at')
        .eq('case_id', caseId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(10) as Promise<{ data: DocumentRow[] | null }>,
      conversationId
        ? (supabase
          .from('ai_messages')
          .select('role, content, type')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .limit(10) as Promise<{ data: MessageRow[] | null }>)
        : Promise.resolve({ data: [] as MessageRow[] }),
    ])

  const c = caseResult.data
  const caseDetails = c
    ? `Case Title: ${c.title}
Case Number: ${c.case_number}
Case Type: ${c.case_type}
Status: ${c.status}
Client: ${c.client_name}
${c.client_contact ? 'Client Contact: ' + c.client_contact : ''}
${c.opposing_party ? 'Opposing Party: ' + c.opposing_party : ''}
${c.court_name ? 'Court: ' + c.court_name : ''}
${c.judge_name ? 'Judge: ' + c.judge_name : ''}
${c.filed_date ? 'Filed: ' + c.filed_date : ''}
${c.description ? '\nCase Description:\n' + c.description : ''}
${c.notes ? '\nCase Notes:\n' + c.notes : ''}`.trim()
    : 'Case details not available'

  const hearings = hearingsResult.data ?? []
  const upcomingHearings =
    hearings.length > 0
      ? hearings
        .map(
          (h) =>
            `- ${h.title}: ${h.hearing_date}` +
            (h.hearing_time ? ` at ${h.hearing_time}` : '') +
            (h.court_name ? ` at ${h.court_name}` : ''),
        )
        .join('\n')
      : 'No upcoming hearings'

  const deadlinesList =
    (deadlinesResult.data ?? [])
      .map((d) => `- ${d.title}: due ${d.due_date} (${d.priority} priority)`)
      .join('\n') || 'No active deadlines'

  const documentsList =
    (documentsResult.data ?? []).map((d) => `- ${d.name} (${d.doc_type})`).join('\n') ||
    'No documents uploaded'

  const msgs = (messagesResult.data ?? []).slice().reverse()
  const recentMessages =
    msgs.length > 0
      ? msgs
        .map(
          (m) =>
            `${m.role === 'user' ? 'Lawyer' : 'AI'}: ${m.content.slice(0, 200)}${m.content.length > 200 ? '...' : ''}`,
        )
        .join('\n')
      : ''

  return { caseDetails, upcomingHearings, deadlines: deadlinesList, documents: documentsList, recentMessages }
}

export function buildSystemPrompt(context: CaseContext): string {
  return `You are an AI legal assistant helping a Pakistani lawyer manage their cases. You have full context about this specific case.

CASE INFORMATION:
${context.caseDetails}

UPCOMING HEARINGS:
${context.upcomingHearings}

ACTIVE DEADLINES:
${context.deadlines}

CASE DOCUMENTS:
${context.documents}

GUIDELINES:
- You are knowledgeable about Pakistani law and court procedures
- Be professional, concise, and precise
- When referencing documents, use their names
- If you need more information, ask clearly
- Always remind lawyer to verify legal advice
- Format responses with markdown for clarity
- Keep responses focused and actionable
${context.recentMessages ? '\nCONVERSATION HISTORY:\n' + context.recentMessages : ''}`.trim()
}

export function buildPromptMessage(
  promptType: string,
  _caseContext: CaseContext,
  extraContext?: string,
): string {
  const prompts: Record<string, string> = {
    summarize_case:
      'Please provide a comprehensive structured summary of this case based on all available information.',
    prep_for_hearing:
      'I have an upcoming hearing. Please help me prepare thoroughly. Cover: key arguments to present, documents to bring, anticipated questions from the judge, and a preparation checklist.',
    analyze_document: extraContext
      ? 'Please analyze this document:\n\n' + extraContext
      : 'Please analyze the most recent document in this case.',
    review_notes:
      'Please review and professionally restructure the case notes. Fix any grammar issues and organize them clearly.',
    draft_section: extraContext
      ? 'Please draft the following section: ' + extraContext
      : 'What section would you like me to help draft? Please specify (e.g., petition intro, relief sought, legal arguments).',
  }
  return prompts[promptType] ?? 'How can I help with this case?'
}

export type MessageRole = 'user' | 'assistant'

export type MessageType =
  | 'text'
  | 'prompt_trigger'
  | 'document_ref'
  | 'file_upload'

export interface ChatMessage {
  id: string
  conversationId: string
  role: MessageRole
  content: string
  type: MessageType
  metadata?: {
    promptLabel?: string
    documentId?: string
    documentName?: string
    fileName?: string
    fileType?: string
    creditsUsed?: number
  }
  createdAt: string
  isStreaming?: boolean
}

export interface Conversation {
  id: string
  caseId: string
  userId: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

export type PromptType =
  | 'summarize_case'
  | 'prep_for_hearing'
  | 'analyze_document'
  | 'review_notes'
  | 'draft_section'
  | 'free_chat'

export interface PromptChip {
  type: PromptType
  label: string
  icon: string
  creditCost: number
  description: string
  requiresDocument?: boolean
  requiresHearing?: boolean
}

export const PROMPT_CHIPS: PromptChip[] = [
  {
    type: 'summarize_case',
    label: 'Summarize case',
    icon: 'FileText',
    creditCost: 1,
    description: 'Get a structured summary',
  },
  {
    type: 'prep_for_hearing',
    label: 'Prep for hearing',
    icon: 'Scale',
    creditCost: 2,
    description: 'Prepare for next hearing',
    requiresHearing: true,
  },
  {
    type: 'analyze_document',
    label: 'Analyze document',
    icon: 'ScanText',
    creditCost: 2,
    description: 'Extract key information',
    requiresDocument: true,
  },
  {
    type: 'review_notes',
    label: 'Review notes',
    icon: 'NotebookPen',
    creditCost: 1,
    description: 'Clean up your notes',
  },
  {
    type: 'draft_section',
    label: 'Draft section',
    icon: 'PenLine',
    creditCost: 2,
    description: 'Draft legal text',
  },
]

export const PROMPT_CREDIT_COSTS: Record<PromptType, number> = {
  summarize_case: 1,
  prep_for_hearing: 2,
  analyze_document: 2,
  review_notes: 1,
  draft_section: 2,
  free_chat: 1,
}

import { z } from 'zod'

// shared enums

const CASE_TYPES = [
  'civil', 'criminal', 'family', 'corporate',
  'property', 'constitutional', 'tax', 'labour', 'other',
] as const

const CASE_STATUSES = ['active', 'pending', 'closed', 'archived'] as const

const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif',
  'image/webp', 'image/heic', 'image/heif',
] as const

const MESSAGE_TYPES = ['text', 'prompt_trigger', 'document_ref', 'file_upload'] as const

const PROMPT_TYPES = [
  'summarize_case', 'prep_for_hearing', 'analyze_document',
  'review_notes', 'draft_section', 'free_chat',
] as const

const SECTION_TYPES = [
  'petition_intro', 'relief_sought', 'facts',
  'legal_arguments', 'application', 'cover_letter',
] as const

const DEADLINE_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const

// chat

export const chatSchema = z.object({
  caseId: z.string().min(1, 'caseId is required'),
  message: z.string().min(1, 'Message is required').max(4000, 'Message too long (max 4000 chars)'),
  messageType: z.enum(MESSAGE_TYPES).optional(),
  promptType: z.enum(PROMPT_TYPES).optional(),
  documentContext: z.string().max(15000, 'Document context too long').optional(),
  documentName: z.string().max(200, 'Document name too long').optional(),
  imageBase64: z.string().optional(),
  imageMediaType: z.enum(ALLOWED_IMAGE_MIME_TYPES, {
    message: 'Unsupported image type',
  }).optional(),
})

// case-summary

export const caseSummarySchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  clientName: z.string().min(1, 'Client name is required').max(100, 'Client name too long'),
  caseNumber: z.string().max(50, 'Case number too long').optional(),
  caseType: z.enum(CASE_TYPES).optional(),
  status: z.enum(CASE_STATUSES).optional(),
  courtName: z.string().max(200, 'Court name too long').optional(),
  judgeName: z.string().max(200, 'Judge name too long').optional(),
  opposingParty: z.string().max(200, 'Opposing party name too long').optional(),
  description: z.string().max(5000, 'Description too long').optional(),
  notes: z.string().max(5000, 'Notes too long').optional(),
})

// analyze-document

export const analyzeDocumentSchema = z.object({
  documentText: z
    .string()
    .min(50, 'Document text too short to analyze')
    .max(12000, 'Document text too long (max 12000 chars)'),
  documentName: z.string().max(200, 'Document name too long').optional(),
  caseTitle: z.string().max(200, 'Case title too long').optional(),
  caseType: z.string().max(50, 'Case type too long').optional(),
})

// hearing-prep

export const hearingPrepSchema = z.object({
  hearingTitle: z.string().min(1, 'Hearing title is required').max(200, 'Hearing title too long'),
  hearingDate: z.string().min(1, 'Hearing date is required').max(20),
  caseTitle: z.string().min(1, 'Case title is required').max(200, 'Case title too long'),
  hearingTime: z.string().max(10).optional(),
  courtName: z.string().max(200).optional(),
  judgeName: z.string().max(200).optional(),
  caseType: z.string().max(50).optional(),
  clientName: z.string().max(100).optional(),
  opposingParty: z.string().max(200).optional(),
  caseDescription: z.string().max(5000).optional(),
  caseNotes: z.string().max(5000).optional(),
  previousHearings: z.array(z.string().max(200)).max(10).optional(),
})

// clean-notes

export const cleanNotesSchema = z.object({
  rawNotes: z
    .string()
    .min(10, 'Notes too short')
    .max(5000, 'Notes too long (max 5000 chars)'),
  caseTitle: z.string().max(200).optional(),
})

// draft-section

export const draftSectionSchema = z.object({
  sectionType: z.enum(SECTION_TYPES, {
    message: 'Invalid sectionType',
  }),
  caseContext: z
    .string()
    .min(1, 'caseContext required')
    .max(10000, 'Case context too long (max 10000 chars)'),
})

// suggest-deadlines

export const suggestDeadlinesSchema = z.object({
  caseType: z.string().min(1, 'caseType is required').max(50),
  hearingDate: z.string().min(1, 'hearingDate is required').max(20),
  caseTitle: z.string().min(1, 'caseTitle is required').max(200),
})

// internal: validate AI response from suggest-deadlines

export const deadlineSuggestionItemSchema = z.object({
  title: z.string().min(1).max(200),
  days_before_hearing: z.number().int().min(0).max(365),
  priority: z.enum(DEADLINE_PRIORITIES),
  description: z.string().max(500),
})

export const deadlineSuggestionsSchema = z.array(deadlineSuggestionItemSchema)

export type DeadlineSuggestionItem = z.infer<typeof deadlineSuggestionItemSchema>

import { z } from 'zod'

const caseTypeEnum = z.enum([
  'civil',
  'criminal',
  'family',
  'corporate',
  'property',
  'constitutional',
  'tax',
  'labour',
  'other',
])

const caseStatusEnum = z.enum(['active', 'pending', 'closed', 'archived'])

export const createCaseSchema = z.object({
  case_number:    z.string().min(1, 'Case number is required').max(50),
  title:          z.string().min(1, 'Title is required').max(200),
  client_name:    z.string().min(1, 'Client name is required').max(100),
  client_contact: z.string().max(100).optional(),
  opposing_party: z.string().max(200).optional(),
  court_name:     z.string().max(200).optional(),
  judge_name:     z.string().max(200).optional(),
  case_type:      caseTypeEnum,
  status:         caseStatusEnum,
  description:    z.string().max(5000).optional(),
  notes:          z.string().max(5000).optional(),
  filed_date:     z.string().date().optional(),
})

export const updateCaseSchema = createCaseSchema.partial()

export type CreateCaseInput = z.infer<typeof createCaseSchema>
export type UpdateCaseInput = z.infer<typeof updateCaseSchema>
export type CaseTypeEnum    = z.infer<typeof caseTypeEnum>
export type CaseStatusEnum  = z.infer<typeof caseStatusEnum>

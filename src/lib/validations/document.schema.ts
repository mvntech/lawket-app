import { z } from 'zod'

export const documentTypeEnum = z.enum([
  'petition', 'affidavit', 'evidence', 'order',
  'judgment', 'correspondence', 'contract', 'other',
])

export const uploadDocumentSchema = z.object({
  name: z.string().min(1, 'Document name is required').max(200, 'Name too long (max 200 chars)'),
  doc_type: documentTypeEnum.optional(),
  notes: z.string().max(2000, 'Notes too long (max 2000 chars)').optional(),
})

export const updateDocTypeSchema = z.object({
  doc_type: documentTypeEnum,
})

export type UploadDocumentSchemaInput = z.infer<typeof uploadDocumentSchema>

import { z } from 'zod'

const contactRoleEnum = z.enum([
  'client',
  'opposing_counsel',
  'judge',
  'witness',
  'expert',
  'court_staff',
  'other',
])

export const createContactSchema = z.object({
  full_name:    z.string().min(1, 'Full name is required').max(200),
  role:         contactRoleEnum,
  email:        z.string().email('Invalid email address').optional().or(z.literal('')),
  phone:        z.string().max(20).optional(),
  organization: z.string().max(200).optional(),
  notes:        z.string().max(2000).optional(),
})

export const updateContactSchema = createContactSchema.partial()

// schema for linking a contact to a case
export const linkContactSchema = z.object({
  contact_id: z.string().uuid('Invalid contact ID'),
  case_id:    z.string().uuid('Invalid case ID'),
})

export type CreateContactInput = z.infer<typeof createContactSchema>
export type UpdateContactInput = z.infer<typeof updateContactSchema>
export type ContactRoleEnum    = z.infer<typeof contactRoleEnum>

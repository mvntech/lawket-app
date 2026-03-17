import { z } from 'zod'

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/

const deadlinePriorityEnum = z.enum(['low', 'medium', 'high', 'critical'])

export const createDeadlineSchema = z.object({
  case_id:  z.string().uuid('Invalid case ID'),
  title:    z.string().min(1, 'Title is required').max(200),
  due_date: z.string().date('Invalid date format'),
  due_time: z
    .string()
    .regex(timeRegex, 'Invalid time format (HH:MM)')
    .optional(),
  priority: deadlinePriorityEnum,
  notes:    z.string().max(2000).optional(),
})

export const updateDeadlineSchema = createDeadlineSchema
  .omit({ case_id: true })
  .partial()

export const completeDeadlineSchema = z.object({
  is_completed: z.literal(true),
  completed_at: z.string().datetime().optional(),
})

export type CreateDeadlineInput   = z.infer<typeof createDeadlineSchema>
export type UpdateDeadlineInput   = z.infer<typeof updateDeadlineSchema>
export type DeadlinePriorityEnum  = z.infer<typeof deadlinePriorityEnum>

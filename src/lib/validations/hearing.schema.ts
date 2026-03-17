import { z } from 'zod'

// HH:MM or HH:MM:SS
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/

export const createHearingSchema = z.object({
  case_id: z.string().uuid('Invalid case ID'),
  title: z.string().min(1, 'Title is required').max(200),
  hearing_date: z.string().date('Invalid date format'),
  hearing_time: z
    .string()
    .regex(timeRegex, 'Invalid time format (HH:MM)')
    .optional(),
  court_name: z.string().max(200).optional(),
  court_room: z.string().max(100).optional(),
  judge_name: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
})

export const updateHearingSchema = createHearingSchema
  .omit({ case_id: true })
  .partial()

export type CreateHearingInput = z.infer<typeof createHearingSchema>
export type UpdateHearingInput = z.infer<typeof updateHearingSchema>

import { z } from 'zod'

export const updateProfileSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  phone: z
    .string()
    .max(30, 'Phone number too long')
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  bar_number: z
    .string()
    .max(50, 'Bar number too long')
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  timezone: z.string().max(100).optional(),
})

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

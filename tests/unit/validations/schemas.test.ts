import { describe, it, expect } from 'vitest'
import { createCaseSchema } from '@/lib/validations/case.schema'
import { createHearingSchema } from '@/lib/validations/hearing.schema'
import { createDeadlineSchema } from '@/lib/validations/deadline.schema'
import { createContactSchema } from '@/lib/validations/contact.schema'
import { registerSchema } from '@/lib/validations/auth.schema'

// createCaseSchema

describe('createCaseSchema', () => {
  it('accepts valid case data', () => {
    const result = createCaseSchema.safeParse({
      case_number: 'CR-2024-0441',
      title: 'Ahmad v. State',
      client_name: 'Tariq Ahmad',
      case_type: 'criminal',
      status: 'active',
    })

    expect(result.success).toBe(true)
  })

  it('accepts all optional fields when provided', () => {
    const result = createCaseSchema.safeParse({
      case_number: 'CV-2024-0001',
      title: 'Khan v. State Bank',
      client_name: 'Bilal Khan',
      client_contact: '+92 300 1234567',
      opposing_party: 'State Bank of Pakistan',
      court_name: 'High Court Lahore',
      judge_name: 'Justice Noor',
      case_type: 'civil',
      status: 'pending',
      description: 'Contract dispute',
      notes: 'Urgent',
      filed_date: '2024-03-15',
    })

    expect(result.success).toBe(true)
  })

  it('rejects empty title', () => {
    const result = createCaseSchema.safeParse({
      case_number: 'CR-001',
      title: '',
      client_name: 'Tariq Ahmad',
      case_type: 'criminal',
      status: 'active',
    })

    expect(result.success).toBe(false)
    const paths = result.error?.issues.map(i => i.path).flat()
    expect(paths).toContain('title')
  })

  it('rejects missing client_name', () => {
    const result = createCaseSchema.safeParse({
      case_number: 'CR-001',
      title: 'Test Case',
      client_name: '',
      case_type: 'criminal',
      status: 'active',
    })

    expect(result.success).toBe(false)
  })

  it('rejects invalid case_type enum value', () => {
    const result = createCaseSchema.safeParse({
      case_number: 'CR-001',
      title: 'Test Case',
      client_name: 'Ahmad',
      case_type: 'invalid_type',
      status: 'active',
    })

    expect(result.success).toBe(false)
  })

  it('rejects invalid status enum value', () => {
    const result = createCaseSchema.safeParse({
      case_number: 'CR-001',
      title: 'Test Case',
      client_name: 'Ahmad',
      case_type: 'civil',
      status: 'invalid',
    })

    expect(result.success).toBe(false)
  })

  it('accepts all valid case_type values', () => {
    const validTypes = [
      'civil', 'criminal', 'family', 'corporate',
      'property', 'constitutional', 'tax', 'labour', 'other',
    ] as const

    for (const caseType of validTypes) {
      const result = createCaseSchema.safeParse({
        case_number: 'CR-001',
        title: 'Test',
        client_name: 'Ahmad',
        case_type: caseType,
        status: 'active',
      })
      expect(result.success).toBe(true)
    }
  })

  it('accepts all valid status values', () => {
    const validStatuses = ['active', 'pending', 'closed', 'archived'] as const

    for (const status of validStatuses) {
      const result = createCaseSchema.safeParse({
        case_number: 'CR-001',
        title: 'Test',
        client_name: 'Ahmad',
        case_type: 'civil',
        status,
      })
      expect(result.success).toBe(true)
    }
  })

  it('rejects title exceeding 200 characters', () => {
    const result = createCaseSchema.safeParse({
      case_number: 'CR-001',
      title: 'A'.repeat(201),
      client_name: 'Ahmad',
      case_type: 'civil',
      status: 'active',
    })

    expect(result.success).toBe(false)
  })
})

// createHearingSchema

describe('createHearingSchema', () => {
  it('accepts valid hearing data', () => {
    const result = createHearingSchema.safeParse({
      case_id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'First hearing',
      hearing_date: '2026-03-20',
    })

    expect(result.success).toBe(true)
  })

  it('accepts optional fields when provided', () => {
    const result = createHearingSchema.safeParse({
      case_id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Bail hearing',
      hearing_date: '2026-04-15',
      hearing_time: '10:30',
      court_name: 'Sessions Court Karachi',
      court_room: 'Room 5',
      judge_name: 'Justice Ali',
      notes: 'Bring medical reports',
    })

    expect(result.success).toBe(true)
  })

  it('rejects invalid date format', () => {
    const result = createHearingSchema.safeParse({
      case_id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Hearing',
      hearing_date: 'not-a-date',
    })

    expect(result.success).toBe(false)
  })

  it('rejects invalid UUID for case_id', () => {
    const result = createHearingSchema.safeParse({
      case_id: 'not-a-uuid',
      title: 'Hearing',
      hearing_date: '2026-03-20',
    })

    expect(result.success).toBe(false)
  })

  it('rejects invalid time format', () => {
    const result = createHearingSchema.safeParse({
      case_id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Hearing',
      hearing_date: '2026-03-20',
      hearing_time: '25:99',
    })

    expect(result.success).toBe(false)
  })

  it('accepts valid HH:MM time format', () => {
    const result = createHearingSchema.safeParse({
      case_id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Hearing',
      hearing_date: '2026-03-20',
      hearing_time: '14:30',
    })

    expect(result.success).toBe(true)
  })
})

// registerSchema (password validation)

describe('registerSchema', () => {
  it('accepts valid registration data', () => {
    const result = registerSchema.safeParse({
      full_name: 'Advocate Sarah Khan',
      email: 'sarah@lawfirm.com',
      password: 'SecurePass123',
      confirm_password: 'SecurePass123',
    })

    expect(result.success).toBe(true)
  })

  it('rejects when passwords do not match', () => {
    const result = registerSchema.safeParse({
      full_name: 'Advocate Sarah',
      email: 'sarah@lawfirm.com',
      password: 'SecurePass123',
      confirm_password: 'DifferentPass456',
    })

    expect(result.success).toBe(false)
    const messages = result.error?.issues.map(i => i.message)
    expect(messages?.some(m => m.toLowerCase().includes('match'))).toBe(true)
  })

  it('rejects password without a number', () => {
    const result = registerSchema.safeParse({
      full_name: 'Advocate Sarah',
      email: 'sarah@lawfirm.com',
      password: 'PasswordNoNumber',
      confirm_password: 'PasswordNoNumber',
    })

    expect(result.success).toBe(false)
  })

  it('rejects password without an uppercase letter', () => {
    const result = registerSchema.safeParse({
      full_name: 'Advocate Sarah',
      email: 'sarah@lawfirm.com',
      password: 'password123',
      confirm_password: 'password123',
    })

    expect(result.success).toBe(false)
  })

  it('rejects password under 8 characters', () => {
    const result = registerSchema.safeParse({
      full_name: 'Advocate',
      email: 'a@b.com',
      password: 'Ab1!',
      confirm_password: 'Ab1!',
    })

    expect(result.success).toBe(false)
  })

  it('rejects invalid email format', () => {
    const result = registerSchema.safeParse({
      full_name: 'Advocate Sarah',
      email: 'not-an-email',
      password: 'SecurePass123',
      confirm_password: 'SecurePass123',
    })

    expect(result.success).toBe(false)
  })
})

// createDeadlineSchema

describe('createDeadlineSchema', () => {
  it('accepts valid deadline data', () => {
    const result = createDeadlineSchema.safeParse({
      case_id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Submit appeal brief',
      due_date: '2026-06-01',
      priority: 'high',
    })
    expect(result.success).toBe(true)
  })

  it('accepts all optional fields when provided', () => {
    const result = createDeadlineSchema.safeParse({
      case_id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'File affidavit',
      due_date: '2026-06-15',
      due_time: '17:00',
      priority: 'critical',
      notes: 'File with the registrar before 5pm',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid priority value', () => {
    const result = createDeadlineSchema.safeParse({
      case_id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Submit brief',
      due_date: '2026-06-01',
      priority: 'urgent',
    })
    expect(result.success).toBe(false)
  })

  it('accepts all valid priority values', () => {
    const priorities = ['low', 'medium', 'high', 'critical'] as const
    for (const priority of priorities) {
      const result = createDeadlineSchema.safeParse({
        case_id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Test',
        due_date: '2026-06-01',
        priority,
      })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid date format', () => {
    const result = createDeadlineSchema.safeParse({
      case_id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Submit brief',
      due_date: '01/06/2026',
      priority: 'high',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid UUID for case_id', () => {
    const result = createDeadlineSchema.safeParse({
      case_id: 'not-a-uuid',
      title: 'Submit brief',
      due_date: '2026-06-01',
      priority: 'medium',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid time format', () => {
    const result = createDeadlineSchema.safeParse({
      case_id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Submit brief',
      due_date: '2026-06-01',
      due_time: '25:99',
      priority: 'medium',
    })
    expect(result.success).toBe(false)
  })
})

// createContactSchema

describe('createContactSchema', () => {
  it('accepts valid contact data', () => {
    const result = createContactSchema.safeParse({
      full_name: 'Ahmad Khan',
      role: 'client',
      email: 'ahmad@example.com',
      phone: '+92 300 1234567',
      organization: 'Khan & Associates',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email format', () => {
    const result = createContactSchema.safeParse({
      full_name: 'Ahmad Khan',
      role: 'client',
      email: 'not-an-email',
    })
    expect(result.success).toBe(false)
  })

  it('accepts empty email (optional field)', () => {
    const result = createContactSchema.safeParse({
      full_name: 'Ahmad Khan',
      role: 'client',
    })
    expect(result.success).toBe(true)
  })

  it('accepts all valid role values', () => {
    const roles = [
      'client', 'opposing_counsel', 'judge',
      'witness', 'expert', 'court_staff', 'other',
    ] as const
    for (const role of roles) {
      const result = createContactSchema.safeParse({
        full_name: 'Test Contact',
        role,
      })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid role value', () => {
    const result = createContactSchema.safeParse({
      full_name: 'Ahmad Khan',
      role: 'police_officer',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty full_name', () => {
    const result = createContactSchema.safeParse({
      full_name: '',
      role: 'client',
    })
    expect(result.success).toBe(false)
  })
})

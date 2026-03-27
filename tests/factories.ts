// realistic legal data factories for all tests.
// never use 'foo', 'bar', 'test'.

export const mockUserId = 'user-test-muntaha-123'

export function makeCase(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'case-' + Math.random().toString(36).slice(2),
    user_id: mockUserId,
    case_number: 'CR-2026-0441',
    title: 'Ahmad v. State',
    client_name: 'Tariq Ahmad',
    client_contact: '+92 300 1234567',
    opposing_party: 'State of Pakistan',
    court_name: 'District Court Karachi',
    judge_name: 'Justice Abdul Rauf',
    case_type: 'criminal',
    status: 'active',
    description: 'Criminal appeal case',
    notes: null,
    filed_date: '2026-01-15',
    is_deleted: false,
    deleted_at: null,
    deleted_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

export function makeHearing(overrides: Partial<Record<string, unknown>> = {}) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return {
    id: 'hearing-' + Math.random().toString(36).slice(2),
    case_id: 'case-test-123',
    user_id: mockUserId,
    title: 'First hearing',
    hearing_date: tomorrow.toISOString().split('T')[0],
    hearing_time: '10:00',
    court_name: 'District Court Karachi',
    court_room: 'Room 4',
    judge_name: 'Justice Abdul Rauf',
    notes: null,
    reminder_24h_sent: false,
    reminder_1h_sent: false,
    is_deleted: false,
    deleted_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

export function makeDeadline(overrides: Partial<Record<string, unknown>> = {}) {
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)
  return {
    id: 'deadline-' + Math.random().toString(36).slice(2),
    case_id: 'case-test-123',
    user_id: mockUserId,
    title: 'Submit appeal brief',
    due_date: nextWeek.toISOString().split('T')[0],
    due_time: '17:00',
    priority: 'high',
    is_completed: false,
    completed_at: null,
    notes: null,
    reminder_sent: false,
    is_deleted: false,
    deleted_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

export function makeContact(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'contact-' + Math.random().toString(36).slice(2),
    user_id: mockUserId,
    full_name: 'Ahmad Khan',
    role: 'client',
    email: 'ahmad@example.com',
    phone: '+92 300 1234567',
    organization: 'Khan & Associates',
    notes: null,
    is_deleted: false,
    deleted_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

export function makeCredits(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'credits-123',
    user_id: mockUserId,
    balance: 10,
    lifetime_earned: 10,
    ad_credits_today: 0,
    ad_credits_reset_at: new Date().toISOString().split('T')[0],
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

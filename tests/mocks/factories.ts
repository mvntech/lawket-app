import type { LocalCase, LocalHearing, LocalDeadline, LocalContact } from '@/lib/db/dexie'
import type { ContactModel } from '@/types/common.types'

export function createMockCase(overrides?: Partial<LocalCase>): LocalCase {
  return {
    id: 'case-' + Math.random().toString(36).slice(2),
    user_id: 'user-test-123',
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
    notes: 'Client maintains innocence',
    filed_date: '2026-01-15',
    is_deleted: false,
    deleted_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    _synced: true,
    _dirty: false,
    ...overrides,
  }
}

export function createMockHearing(overrides?: Partial<LocalHearing>): LocalHearing {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return {
    id: 'hearing-' + Math.random().toString(36).slice(2),
    case_id: 'case-test-123',
    user_id: 'user-test-123',
    title: 'First hearing',
    hearing_date: tomorrow.toISOString().split('T')[0],
    hearing_time: '10:00',
    court_name: 'District Court Karachi',
    court_room: 'Room 4',
    judge_name: 'Justice Abdul Rauf',
    notes: null,
    is_deleted: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    _synced: true,
    _dirty: false,
    ...overrides,
  }
}

export function createMockDeadline(overrides?: Partial<LocalDeadline>): LocalDeadline {
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)
  return {
    id: 'deadline-' + Math.random().toString(36).slice(2),
    case_id: 'case-test-123',
    user_id: 'user-test-123',
    title: 'Submit appeal brief',
    due_date: nextWeek.toISOString().split('T')[0],
    due_time: '17:00',
    priority: 'high',
    is_completed: false,
    completed_at: null,
    notes: null,
    is_deleted: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    _synced: true,
    _dirty: false,
    ...overrides,
  }
}

export function createMockContact(overrides?: Partial<LocalContact>): LocalContact {
  return {
    id: 'contact-' + Math.random().toString(36).slice(2),
    user_id: 'user-test-123',
    full_name: 'Ahmad Khan',
    role: 'client',
    email: 'ahmad@example.com',
    phone: '+92 300 1234567',
    organization: 'Khan & Associates',
    notes: null,
    is_deleted: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    _synced: true,
    _dirty: false,
    ...overrides,
  }
}

export type MockProfile = {
  id: string
  full_name: string
  email: string
  bar_number: string | null
  phone: string | null
  avatar_url: string | null
  timezone: string
  is_active: boolean
  last_seen_at: string | null
  created_at: string
  updated_at: string
}

export function createMockProfile(overrides?: Partial<MockProfile>): MockProfile {
  return {
    id: 'user-test-123',
    full_name: 'Advocate Sarah Khan',
    email: 'sarah@lawfirm.com',
    bar_number: 'PBC-2026-1234',
    phone: '+92 321 9876543',
    avatar_url: null,
    timezone: 'Asia/Karachi',
    is_active: true,
    last_seen_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

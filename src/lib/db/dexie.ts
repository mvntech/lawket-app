import Dexie, { type Table } from 'dexie'
import type { CaseStatus, CaseType, DocumentType } from '@/types/common.types'

export interface LocalCase {
  id: string
  user_id: string
  case_number: string
  title: string
  client_name: string
  client_contact: string | null
  opposing_party: string | null
  court_name: string | null
  judge_name: string | null
  case_type: CaseType
  status: CaseStatus
  description: string | null
  notes: string | null
  filed_date: string | null
  is_deleted: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
  _synced: boolean
  _dirty: boolean
}

export interface LocalHearing {
  id: string
  case_id: string
  user_id: string
  title: string
  hearing_date: string
  hearing_time: string | null
  court_name: string | null
  court_room: string | null
  judge_name: string | null
  notes: string | null
  is_deleted: boolean
  created_at: string
  updated_at: string
  _synced: boolean
  _dirty: boolean
}

export interface LocalDeadline {
  id: string
  case_id: string
  user_id: string
  title: string
  due_date: string
  due_time: string | null
  priority: string
  is_completed: boolean
  completed_at: string | null
  notes: string | null
  is_deleted: boolean
  created_at: string
  updated_at: string
  _synced: boolean
  _dirty: boolean
}

export interface LocalContact {
  id: string
  user_id: string
  full_name: string
  role: string
  email: string | null
  phone: string | null
  organization: string | null
  notes: string | null
  is_deleted: boolean
  created_at: string
  updated_at: string
  _synced: boolean
  _dirty: boolean
}

export interface LocalDocument {
  id: string
  case_id: string
  user_id: string
  name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  doc_type: DocumentType
  notes: string | null
  is_deleted: boolean
  deleted_at: string | null
  created_at: string
  _synced: boolean
}

export interface PendingSyncOperation {
  id?: number
  table_name: string
  operation: 'insert' | 'update'
  record_id: string
  payload: string
  created_at: string
  retry_count: number
}

class LawketDB extends Dexie {
  cases!: Table<LocalCase>
  hearings!: Table<LocalHearing>
  deadlines!: Table<LocalDeadline>
  contacts!: Table<LocalContact>
  documents!: Table<LocalDocument>
  pendingSync!: Table<PendingSyncOperation>

  constructor() {
    super('lawket-db')
    this.version(1).stores({
      cases: 'id, user_id, status, updated_at, is_deleted, _dirty',
      hearings: 'id, case_id, user_id, hearing_date, is_deleted',
      deadlines: 'id, case_id, user_id, due_date, is_deleted',
      contacts: 'id, user_id, is_deleted',
      pendingSync: '++id, table_name, record_id, retry_count',
    })
    this.version(2).stores({
      cases: 'id, user_id, status, updated_at, is_deleted, _dirty',
      hearings: 'id, case_id, user_id, hearing_date, is_deleted',
      deadlines: 'id, case_id, user_id, due_date, is_deleted',
      contacts: 'id, user_id, is_deleted',
      pendingSync: '++id, table_name, record_id, retry_count',
      documents: 'id, case_id, user_id, is_deleted, created_at',
    })
    this.version(3).stores({
      cases: 'id, user_id, status, updated_at, is_deleted, _dirty',
      hearings: 'id, case_id, user_id, hearing_date, is_deleted',
      deadlines: 'id, case_id, user_id, due_date, is_deleted',
      contacts: 'id, user_id, role, full_name, is_deleted, _dirty',
      pendingSync: '++id, table_name, record_id, retry_count',
      documents: 'id, case_id, user_id, is_deleted, created_at',
    })
  }
}

export const db = new LawketDB()

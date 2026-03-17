import type {
  CaseStatus,
  CaseType,
  DeadlinePriority,
  ContactRole,
  DocumentType,
  NotificationType,
} from './database.types'

// re-export DB enums for convenience

export type { CaseStatus, CaseType, DeadlinePriority, ContactRole, DocumentType, NotificationType }

// pagination

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface PaginationParams {
  page?: number
  pageSize?: number
}

// sync

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline'

export interface SyncState {
  status: SyncStatus
  lastSyncedAt: string | null
  pendingCount: number
  errorMessage: string | null
}

// errors

export interface ApiError {
  message: string
  code?: string
  statusCode?: number
}

export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'DatabaseError'
  }
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'NetworkError'
  }
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

export class StorageError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'StorageError'
  }
}

// soft delete

export interface SoftDeletable {
  is_deleted: boolean
  deleted_at: string | null
}

// sorting

export type SortOrder = 'asc' | 'desc'

export interface SortParams {
  column: string
  order: SortOrder
}

// search

export interface SearchParams {
  query?: string
  filters?: Record<string, string | boolean | number>
}

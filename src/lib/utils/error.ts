import type { AuthApiError, PostgrestError } from '@supabase/supabase-js'
import {
  AuthError,
  DatabaseError,
  NetworkError,
  StorageError,
} from '@/types/common.types'

export { AuthError, DatabaseError, NetworkError, StorageError }

export function mapSupabaseError(
  error: PostgrestError | AuthApiError | Error | unknown,
): DatabaseError | AuthError | NetworkError {
  if (error instanceof DatabaseError || error instanceof AuthError || error instanceof NetworkError) {
    return error
  }

  if (typeof error === 'object' && error !== null) {
    const e = error as Record<string, unknown>

    // Supabase AuthApiError
    if ('status' in e && 'message' in e && typeof e.message === 'string') {
      const status = e.status as number
      if (status === 401 || status === 403) {
        return new AuthError(e.message, error)
      }
      if (status === 0 || status >= 500) {
        return new NetworkError(e.message, error)
      }
      return new DatabaseError(e.message, error)
    }

    // PostgrestError
    if ('code' in e && 'message' in e && typeof e.message === 'string') {
      return new DatabaseError(e.message, error)
    }
  }

  if (error instanceof Error) {
    return new DatabaseError(error.message, error)
  }

  return new DatabaseError('An unexpected error occurred', error)
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError
}

export function isDatabaseError(error: unknown): error is DatabaseError {
  return error instanceof DatabaseError
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError
}

// returns a user-friendly message
export function getErrorMessage(error: unknown): string {
  if (error instanceof AuthError) {
    const msg = error.message.toLowerCase()
    if (msg.includes('invalid login credentials') || msg.includes('invalid password')) {
      return 'Invalid email or password.'
    }
    if (msg.includes('email not confirmed')) {
      return 'Please confirm your email before signing in.'
    }
    if (msg.includes('user already registered') || msg.includes('already been registered')) {
      return 'An account with this email already exists.'
    }
    if (msg.includes('session')) {
      return 'Session expired. Please sign in again.'
    }
    return 'Authentication failed. Please try again.'
  }

  if (error instanceof NetworkError) {
    return 'Network error. Check your connection and try again.'
  }

  if (error instanceof DatabaseError) {
    return 'Something went wrong. Please try again.'
  }

  if (error instanceof StorageError) {
    return 'File operation failed. Please try again.'
  }

  return 'Something went wrong. Please try again.'
}

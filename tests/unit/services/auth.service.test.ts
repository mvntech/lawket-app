import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockSupabase } from '../../mocks/supabase'

// module mocks

vi.mock('@/lib/db/dexie', () => ({
  db: {
    cases: { clear: vi.fn().mockResolvedValue(undefined) },
    hearings: { clear: vi.fn().mockResolvedValue(undefined) },
    deadlines: { clear: vi.fn().mockResolvedValue(undefined) },
    contacts: { clear: vi.fn().mockResolvedValue(undefined) },
    pendingSync: { clear: vi.fn().mockResolvedValue(undefined) },
  },
}))

let mockSupabase = createMockSupabase()

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: vi.fn(() => mockSupabase),
}))

vi.mock('@/lib/analytics', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  captureError: vi.fn(),
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
  analytics: {},
}))

// tests

import { authService } from '@/services/auth.service'
import { db } from '@/lib/db/dexie'

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabase()
  })

  // signOut

  describe('signOut', () => {
    it('calls supabase.auth.signOut', async () => {
      await authService.signOut()

      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
    })

    it('clears all Dexie tables on sign-out', async () => {
      await authService.signOut()

      expect(db.cases.clear).toHaveBeenCalled()
      expect(db.hearings.clear).toHaveBeenCalled()
      expect(db.deadlines.clear).toHaveBeenCalled()
      expect(db.contacts.clear).toHaveBeenCalled()
      expect(db.pendingSync.clear).toHaveBeenCalled()
    })

    it('throws AuthError when Supabase signOut fails', async () => {
      mockSupabase.auth.signOut = vi.fn().mockResolvedValue({
        error: { message: 'Network error' },
      })

      await expect(authService.signOut()).rejects.toThrow()
    })
  })

  // signIn

  describe('signIn', () => {
    it('returns session on successful sign-in', async () => {
      mockSupabase.auth.signInWithPassword = vi.fn().mockResolvedValue({
        data: {
          session: { access_token: 'mock-token' },
          user: { id: 'user-123' },
        },
        error: null,
      })

      const session = await authService.signIn('sarah@lawfirm.com', 'Password123!')

      expect(session).toBeDefined()
      expect(session?.access_token).toBe('mock-token')
    })

    it('throws AuthError when credentials are invalid', async () => {
      mockSupabase.auth.signInWithPassword = vi.fn().mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Invalid login credentials' },
      })

      await expect(
        authService.signIn('sarah@lawfirm.com', 'wrongpass')
      ).rejects.toThrow('Invalid login credentials')
    })
  })

  // signUp

  describe('signUp', () => {
    it('returns user data on successful registration', async () => {
      mockSupabase.auth.signUp = vi.fn().mockResolvedValue({
        data: { user: { id: 'new-user-123', email: 'new@lawfirm.com' }, session: null },
        error: null,
      })

      const result = await authService.signUp('new@lawfirm.com', 'Password123!', 'Advocate Smith')

      expect(result.user).toBeDefined()
      expect(result.user?.id).toBe('new-user-123')
    })

    it('throws AuthError when Supabase returns an error', async () => {
      mockSupabase.auth.signUp = vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email already registered' },
      })

      await expect(
        authService.signUp('existing@lawfirm.com', 'Password123!', 'Advocate')
      ).rejects.toThrow('Email already registered')
    })
  })

  // getSession

  describe('getSession', () => {
    it('returns session when user is authenticated', async () => {
      mockSupabase.auth.getSession = vi.fn().mockResolvedValue({
        data: { session: { access_token: 'valid-token', user: { id: 'user-123' } } },
        error: null,
      })

      const session = await authService.getSession()

      expect(session).not.toBeNull()
      expect(session?.access_token).toBe('valid-token')
    })

    it('returns null when not authenticated', async () => {
      mockSupabase.auth.getSession = vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      })

      const session = await authService.getSession()

      expect(session).toBeNull()
    })
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockSupabase } from '../../mocks/supabase'

// ── module mocks ──────────────────────────────────────────────────────────────

let mockSupabase = createMockSupabase()

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: vi.fn(() => mockSupabase),
}))

vi.mock('@/lib/analytics', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  captureError: vi.fn(),
}))

// ── imports ───────────────────────────────────────────────────────────────────

import { settingsService } from '@/services/settings.service'
import { DatabaseError, StorageError, AuthError } from '@/types/common.types'

// ── tests ─────────────────────────────────────────────────────────────────────

describe('settingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabase()
  })

  // ── updateProfile ────────────────────────────────────────────────────────

  describe('updateProfile', () => {
    it('rejects empty full_name before hitting Supabase', async () => {
      await expect(
        settingsService.updateProfile('user-123', {
          full_name: '',
          phone: null,
          bar_number: null,
        }),
      ).rejects.toThrow(DatabaseError)

      // Supabase update must not be called for invalid input
      expect(mockSupabase.from('profiles').update).not.toHaveBeenCalled()
    })

    it('rejects full_name exceeding 100 chars before hitting Supabase', async () => {
      await expect(
        settingsService.updateProfile('user-123', {
          full_name: 'A'.repeat(101),
          phone: null,
          bar_number: null,
        }),
      ).rejects.toThrow(DatabaseError)

      expect(mockSupabase.from('profiles').update).not.toHaveBeenCalled()
    })

    it('rejects bar_number exceeding 50 chars', async () => {
      await expect(
        settingsService.updateProfile('user-123', {
          full_name: 'Sarah Khan',
          bar_number: 'B'.repeat(51),
          phone: null,
        }),
      ).rejects.toThrow(DatabaseError)
    })

    it('calls Supabase update with parsed (sanitized) data on valid input', async () => {
      const mockProfile = {
        id: 'user-123',
        full_name: 'Sarah Khan',
        email: 'sarah@lawfirm.com',
      }

      const builder = mockSupabase.from('profiles')
      vi.mocked(builder.single as any).mockResolvedValue({ data: mockProfile, error: null })

      const result = await settingsService.updateProfile('user-123', {
        full_name: 'Sarah Khan',
        phone: '+92 300 1234567',
        bar_number: null,
      })

      expect((builder.update as any)).toHaveBeenCalledWith(
        expect.objectContaining({ full_name: 'Sarah Khan' }),
      )
      expect(result).toEqual(mockProfile)
    })

    it('throws DatabaseError when Supabase returns an error', async () => {
      const builder = mockSupabase.from('profiles')
      vi.mocked(builder.single as any).mockResolvedValue({
        data: null,
        error: { message: 'DB error', code: '42P01' },
      })

      await expect(
        settingsService.updateProfile('user-123', {
          full_name: 'Sarah Khan',
          phone: null,
          bar_number: null,
        }),
      ).rejects.toThrow(DatabaseError)
    })

    it('transforms null phone correctly (optional field)', async () => {
      const mockProfile = { id: 'user-123', full_name: 'Ahmad', phone: null }
      const builder = mockSupabase.from('profiles')
      vi.mocked(builder.single as any).mockResolvedValue({ data: mockProfile, error: null })

      await settingsService.updateProfile('user-123', {
        full_name: 'Ahmad',
        phone: null,
        bar_number: null,
      })

      expect((builder.update as any)).toHaveBeenCalledWith(
        expect.objectContaining({ phone: null }),
      )
    })
  })

  // ── updateAvatar ─────────────────────────────────────────────────────────

  describe('updateAvatar', () => {
    it('uploads avatar and returns a URL with cache-bust timestamp', async () => {
      const file = new File(['image data'], 'photo.jpg', { type: 'image/jpeg' })

      mockSupabase.storage.from = vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.supabase.co/avatars/user-123/avatar.jpg' },
        }),
      })

      // Mock the profile update after avatar upload
      const builder = mockSupabase.from('profiles')
      vi.mocked(builder.then as any).mockImplementation((resolve: (value: any) => void) =>
        Promise.resolve({ data: null, error: null }).then(resolve),
      )

      const url = await settingsService.updateAvatar('user-123', file)

      expect(url).toContain('https://storage.supabase.co')
      expect(url).toContain('?t=')
    })

    it('throws StorageError when upload fails', async () => {
      const file = new File(['image data'], 'photo.jpg', { type: 'image/jpeg' })

      mockSupabase.storage.from = vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          error: { message: 'Upload failed' },
        }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: '' } }),
      })

      await expect(
        settingsService.updateAvatar('user-123', file),
      ).rejects.toThrow(StorageError)
    })
  })

  // ── changePassword ───────────────────────────────────────────────────────

  describe('changePassword', () => {
    it('calls supabase.auth.updateUser with the new password', async () => {
      await settingsService.changePassword('NewSecure123')

      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        password: 'NewSecure123',
      })
    })

    it('throws AuthError when Supabase returns an error', async () => {
      mockSupabase.auth.updateUser = vi.fn().mockResolvedValue({
        error: { message: 'Auth error' },
      })

      await expect(
        settingsService.changePassword('NewSecure123'),
      ).rejects.toThrow(AuthError)
    })
  })

  // ── getProfile ───────────────────────────────────────────────────────────

  describe('getProfile', () => {
    it('returns profile data from Supabase', async () => {
      const mockProfile = {
        id: 'user-123',
        full_name: 'Sarah Khan',
        email: 'sarah@lawfirm.com',
      }

      const builder = mockSupabase.from('profiles')
      vi.mocked(builder.single as any).mockResolvedValue({ data: mockProfile, error: null })

      const result = await settingsService.getProfile('user-123')

      expect(result).toEqual(mockProfile)
    })

    it('throws DatabaseError when Supabase returns an error', async () => {
      const builder = mockSupabase.from('profiles')
      vi.mocked(builder.single as any).mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      })

      await expect(settingsService.getProfile('user-123')).rejects.toThrow(DatabaseError)
    })
  })
})

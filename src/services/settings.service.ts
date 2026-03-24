import { getSupabaseClient } from '@/lib/supabase/client'
import { DB_TABLES } from '@/lib/constants/db-tables'
import { StorageError, DatabaseError, AuthError } from '@/types/common.types'
import { logger, captureError } from '@/lib/analytics'
import type { Profile } from '@/types/database.types'
import type { UpdateProfileInput } from '@/lib/validations/profile.schema'

// types

export type { Profile }

// supabase typed helpers

type SupabaseClient = ReturnType<typeof getSupabaseClient>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function profilesFrom(supabase: SupabaseClient): any {
  return supabase.from(DB_TABLES.profiles)
}

// service

export const settingsService = {
  async getProfile(userId: string): Promise<Profile> {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await profilesFrom(supabase)
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw new DatabaseError('Failed to fetch profile', error)

      return data as Profile
    } catch (err) {
      if (err instanceof DatabaseError) throw err
      logger.error({ err, userId }, 'settingsService.getProfile failed')
      captureError(err)
      throw new DatabaseError('Failed to fetch profile', err)
    }
  },

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<Profile> {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await profilesFrom(supabase)
        .update(input)
        .eq('id', userId)
        .select()
        .single()

      if (error) throw new DatabaseError('Failed to update profile', error)

      logger.info({ userId }, 'Profile updated')
      return data as Profile
    } catch (err) {
      if (err instanceof DatabaseError) throw err
      logger.error({ err, userId }, 'settingsService.updateProfile failed')
      captureError(err)
      throw new DatabaseError('Failed to update profile', err)
    }
  },

  async updateAvatar(userId: string, file: File): Promise<string> {
    try {
      const supabase = getSupabaseClient()
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${userId}/avatar.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (uploadError) throw new StorageError('Failed to upload avatar', uploadError)

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`

      await profilesFrom(supabase)
        .update({ avatar_url: avatarUrl })
        .eq('id', userId)

      logger.info({ userId }, 'Avatar updated')
      return avatarUrl
    } catch (err) {
      if (err instanceof StorageError) throw err
      logger.error({ err, userId }, 'settingsService.updateAvatar failed')
      captureError(err)
      throw new StorageError('Failed to update avatar', err)
    }
  },

  async changePassword(newPassword: string): Promise<void> {
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })

      if (error) throw new AuthError(error.message, error)

      logger.info('Password changed')
    } catch (err) {
      if (err instanceof AuthError) throw err
      logger.error({ err }, 'settingsService.changePassword failed')
      captureError(err)
      throw new AuthError('Failed to change password', err)
    }
  },

  async deleteAccount(userId: string): Promise<void> {
    try {
      const supabase = getSupabaseClient()

      // soft delete: mark profile inactive + soft-delete all user records
      await profilesFrom(supabase)
        .update({ is_active: false })
        .eq('id', userId)

      // soft delete all cases
      await (supabase.from(DB_TABLES.cases) as any)
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_deleted', false)

      // sign out after deletion
      await supabase.auth.signOut()

      logger.info({ userId }, 'Account deleted (soft)')
    } catch (err) {
      logger.error({ err, userId }, 'settingsService.deleteAccount failed')
      captureError(err)
      throw new DatabaseError('Failed to delete account', err)
    }
  },

  async updateLastSeen(userId: string): Promise<void> {
    try {
      const supabase = getSupabaseClient()
      await profilesFrom(supabase)
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', userId)
    } catch {
      // silently fail (non-critical)
    }
  },
}

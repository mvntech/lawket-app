import type { Session, AuthChangeEvent, Provider } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase/client'
import { DB_TABLES } from '@/lib/constants/db-tables'
import { AuthError } from '@/lib/utils/error'
import { logger } from '@/lib/analytics'
import type { Profile } from '@/types/database.types'
import { db } from '@/lib/db/dexie'

export const authService = {
  async signUp(email: string, password: string, fullName: string) {
    try {
      // check for duplicate email server-side before calling supabase auth
      const checkRes = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase() }),
      })

      if (checkRes.ok) {
        const { exists } = (await checkRes.json()) as { exists: boolean }
        if (exists) {
          throw new AuthError('An account with this email already exists.')
        }
      }

      const supabase = getSupabaseClient()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      })

      if (error) throw new AuthError(error.message, error)
      if (!data.user) throw new AuthError('Sign up failed: no user returned')

      logger.info({ userId: data.user.id }, 'User registered')
      return data
    } catch (err) {
      if (err instanceof AuthError) throw err
      logger.error({ err }, 'authService.signUp failed')
      throw new AuthError('Sign up failed', err)
    }
  },

  async signIn(email: string, password: string) {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) throw new AuthError(error.message, error)
      if (!data.session) throw new AuthError('Sign in failed: no session returned')

      logger.info({ userId: data.user.id }, 'User signed in')
      return data.session
    } catch (err) {
      if (err instanceof AuthError) throw err
      logger.error({ err }, 'authService.signIn failed')
      throw new AuthError('Sign in failed', err)
    }
  },

  async signInWithOAuth(provider: Extract<Provider, 'google' | 'facebook'>) {
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            // request offline access for refresh tokens
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) throw new AuthError(error.message, error)
    } catch (err) {
      if (err instanceof AuthError) throw err
      logger.error({ err, provider }, 'authService.signInWithOAuth failed')
      throw new AuthError(`${provider} sign-in failed`, err)
    }
  },

  async signOut() {
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.signOut()

      if (error) throw new AuthError(error.message, error)

      await Promise.all([
        db.cases.clear(),
        db.hearings.clear(),
        db.deadlines.clear(),
        db.contacts.clear(),
        db.pendingSync.clear(),
      ])

      logger.info('User signed out')
    } catch (err) {
      if (err instanceof AuthError) throw err
      logger.error({ err }, 'authService.signOut failed')
      throw new AuthError('Sign out failed', err)
    }
  },

  async resetPassword(email: string) {
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      })

      if (error) throw new AuthError(error.message, error)

      logger.info({ email }, 'Password reset email sent')
    } catch (err) {
      if (err instanceof AuthError) throw err
      logger.error({ err }, 'authService.resetPassword failed')
      throw new AuthError('Password reset failed', err)
    }
  },

  async updatePassword(newPassword: string) {
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })

      if (error) throw new AuthError(error.message, error)

      logger.info('Password updated')
    } catch (err) {
      if (err instanceof AuthError) throw err
      logger.error({ err }, 'authService.updatePassword failed')
      throw new AuthError('Password update failed', err)
    }
  },

  async signOutOtherSessions(): Promise<void> {
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.signOut({ scope: 'others' })
      if (error) throw new AuthError(error.message, error)
      logger.info('Signed out all other sessions')
    } catch (err) {
      if (err instanceof AuthError) throw err
      logger.error({ err }, 'authService.signOutOtherSessions failed')
      throw new AuthError('Failed to sign out other sessions', err)
    }
  },

  async getSession(): Promise<Session | null> {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.auth.getSession()

      if (error) throw new AuthError(error.message, error)

      return data.session
    } catch (err) {
      if (err instanceof AuthError) throw err
      logger.error({ err }, 'authService.getSession failed')
      throw new AuthError('Failed to get session', err)
    }
  },

  async getUser(): Promise<Profile | null> {
    try {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return null

      const { data: profile, error } = await (supabase.from(DB_TABLES.profiles) as any)
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (error) throw new AuthError('Failed to fetch profile', error)

      // if user exists but profile doesn't, create it
      if (!profile) {
        logger.info({ userId: user.id }, 'Profile missing, creating fail-safe profile')

        const newProfile = {
          id: user.id,
          email: user.email!,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          is_active: true,
        }

        const { data: createdProfile, error: createError } = await (supabase.from(DB_TABLES.profiles) as any)
          .insert(newProfile)
          .select()
          .single()

        if (createError) {
          logger.error({ err: createError, userId: user.id }, 'Fail-safe profile creation failed')
          throw new AuthError('Failed to create user profile', createError)
        }

        return createdProfile as Profile
      }

      return profile as Profile | null
    } catch (err) {
      if (err instanceof AuthError) throw err
      logger.error({ err }, 'authService.getUser failed')
      throw new AuthError('Failed to get user', err)
    }
  },

  onAuthStateChange(
    callback: (event: AuthChangeEvent, session: Session | null) => void,
  ) {
    const supabase = getSupabaseClient()
    return supabase.auth.onAuthStateChange(callback)
  },
}

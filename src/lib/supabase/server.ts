import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database.types'
import { ENV } from '@/lib/constants/env'

// for use in server components and API routes only.
// do not import in client components.
export async function getSupabaseServer() {
  const cookieStore = await cookies()

  return createServerClient<Database>(ENV.supabase.url, ENV.supabase.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // setAll called from a server component — cookies are read-only there.
          // ignored intentionally; session refresh is handled by middleware.
        }
      },
    },
  })
}

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'
import { ENV } from '@/lib/constants/env'

let client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function getSupabaseClient() {
  if (!client) {
    client = createBrowserClient<Database>(ENV.supabase.url, ENV.supabase.anonKey)
  }
  return client
}

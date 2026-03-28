// shared helpers used by every data-service module

import { db } from '@/lib/db/dexie'
import type { PendingSyncOperation } from '@/lib/db/dexie'
import { STALE_TIME_MS } from '@/lib/constants/app'
import { getSupabaseClient } from '@/lib/supabase/client'

// online guard
// navigator is not defined during SSR/edge builds - default to true so
// server-side renders don't incorrectly short-circuit

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

// staleness tracker
// returns a factory so each service module gets its own independent Map
// (preserving the original per-service isolation - e.g. refreshing cases
// doesn't reset the contacts staleness clock)

export function createStaleTracker() {
  const lastFetchedAt = new Map<string, number>()

  return {
    isStale(key: string): boolean {
      const t = lastFetchedAt.get(key)
      return !t || Date.now() - t > STALE_TIME_MS
    },
    markFresh(key: string): void {
      lastFetchedAt.set(key, Date.now())
    },
  }
}

export type SupabaseClientType = ReturnType<typeof getSupabaseClient>

export function createTableHelper(tableName: string): (supabase: SupabaseClientType) => any {
  return (supabase) => supabase.from(tableName)
}

export async function queuePendingSync(
  tableName: string,
  operation: PendingSyncOperation['operation'],
  recordId: string,
  payload: object,
): Promise<void> {
  await db.pendingSync.add({
    table_name: tableName,
    operation,
    record_id: recordId,
    payload: JSON.stringify(payload),
    created_at: new Date().toISOString(),
    retry_count: 0,
  })
}

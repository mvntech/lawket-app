import { db } from '@/lib/db/dexie'
import { getSupabaseClient } from '@/lib/supabase/client'
import { logger, captureException } from '@/lib/analytics'
import { MAX_SYNC_RETRIES } from '@/lib/constants/app'
import type { Database } from '@/types/database.types'

type TableName = keyof Database['public']['Tables']

export async function addToQueue(
  tableName: string,
  operation: 'insert' | 'update',
  recordId: string,
  payload: Record<string, unknown>,
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

export async function flushQueue(): Promise<void> {
  const pending = await db.pendingSync.orderBy('id').toArray()
  if (pending.length === 0) return

  const supabase = getSupabaseClient()

  for (const op of pending) {
    try {
      const payload = JSON.parse(op.payload) as Record<string, unknown>

      // dynamic table access is required in the sync infrastructure layer.
      // table names are validated at write time via DB_TABLES constants.
      const { error } = await (supabase.from(op.table_name as TableName) as any).upsert(payload)

      if (error) throw new Error(error.message)

      if (op.id !== undefined) {
        await db.pendingSync.delete(op.id)
      }

      logger.info(
        { tableName: op.table_name, recordId: op.record_id },
        'Sync operation flushed successfully',
      )
    } catch (err) {
      const retryCount = op.retry_count + 1

      if (retryCount >= MAX_SYNC_RETRIES) {
        logger.error(
          { err, tableName: op.table_name, recordId: op.record_id, retryCount },
          'Sync operation permanently failed after max retries',
        )
        captureException(err, {
          tableName: op.table_name,
          recordId: op.record_id,
          operation: op.operation,
          retryCount,
        })
        // remove to prevent infinite retry loop
        if (op.id !== undefined) {
          await db.pendingSync.delete(op.id)
        }
      } else {
        logger.warn(
          { err, tableName: op.table_name, recordId: op.record_id, retryCount },
          'Sync operation failed, will retry on next flush',
        )
        if (op.id !== undefined) {
          await db.pendingSync.update(op.id, { retry_count: retryCount })
        }
      }
    }
  }
}

export async function getQueueCount(): Promise<number> {
  return db.pendingSync.count()
}

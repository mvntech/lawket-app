import { logger, captureException } from '@/lib/analytics'
import { flushQueue, getQueueCount } from '@/lib/db/sync/write-queue'
import { useSyncStore } from '@/stores/sync.store'
import { STALE_TIME_MS } from '@/lib/constants/app'

class SyncEngine {
  private _running = false

  start(): void {
    if (typeof window === 'undefined') return
    if (this._running) return
    this._running = true

    window.addEventListener('online', this._handleOffline)
    window.addEventListener('offline', this._handleOffline)

    // sync initial online state
    useSyncStore.getState().setOnline(navigator.onLine)

    logger.info('SyncEngine started')
  }

  stop(): void {
    if (typeof window === 'undefined') return
    if (!this._running) return
    this._running = false

    window.removeEventListener('online', this._handleOnline)
    window.removeEventListener('offline', this._handleOffline)

    logger.info('SyncEngine stopped')
  }

  // returns true if data fetched at lastFetchedAt is stale.
  isStale(lastFetchedAt: Date | null): boolean {
    if (!lastFetchedAt) return true
    return Date.now() - lastFetchedAt.getTime() > STALE_TIME_MS
  }

  private _handleOnline = async (): Promise<void> => {
    useSyncStore.getState().setOnline(true)
    logger.info('Network reconnected - flushing sync queue')
    await this._flush()
  }

  private _handleOffline = (): void => {
    useSyncStore.getState().setOnline(false)
    logger.info('Network disconnected - writes will queue locally')
  }

  private async _flush(): Promise<void> {
    const store = useSyncStore.getState()
    if (store.isSyncing) return

    store.setIsSyncing(true)
    try {
      await flushQueue()
      const remaining = await getQueueCount()
      store.setPendingCount(remaining)
      store.setLastSyncedAt(new Date())
      logger.info({ remaining }, 'Sync queue flushed')
    } catch (err) {
      logger.error({ err }, 'Sync flush failed')
      captureException(err, { context: 'SyncEngine._flush' })
    } finally {
      store.setIsSyncing(false)
    }
  }
}

export const syncEngine = new SyncEngine()

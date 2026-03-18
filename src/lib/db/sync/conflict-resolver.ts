import { logger, addBreadcrumb } from '@/lib/analytics'

export type ConflictResolution = 'local' | 'remote'

export interface Conflictable {
  id: string
  updated_at: string
}

// last-write-wins conflict resolution.
// compares updated_at timestamps and returns which version to keep.
export function resolveConflict(local: Conflictable, remote: Conflictable): ConflictResolution {
  const localTime = new Date(local.updated_at).getTime()
  const remoteTime = new Date(remote.updated_at).getTime()
  const resolution: ConflictResolution = localTime > remoteTime ? 'local' : 'remote'

  logger.info(
    {
      recordId: local.id,
      localUpdatedAt: local.updated_at,
      remoteUpdatedAt: remote.updated_at,
      resolution,
    },
    'Sync conflict resolved',
  )

  // track conflict rates in sentry for monitoring
  addBreadcrumb({
    category: 'sync.conflict',
    message: `Conflict resolved: ${resolution} wins for record ${local.id}`,
    data: {
      recordId: local.id,
      localUpdatedAt: local.updated_at,
      remoteUpdatedAt: remote.updated_at,
      resolution,
    },
    level: 'info',
  })

  return resolution
}

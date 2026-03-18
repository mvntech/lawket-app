import { create } from 'zustand'

interface SyncStore {
  isOnline: boolean
  setOnline: (online: boolean) => void

  pendingCount: number
  setPendingCount: (count: number) => void

  lastSyncedAt: Date | null
  setLastSyncedAt: (date: Date | null) => void

  isSyncing: boolean
  setIsSyncing: (syncing: boolean) => void
}

export const useSyncStore = create<SyncStore>()((set) => ({
  isOnline: true,
  setOnline: (online) => set({ isOnline: online }),

  pendingCount: 0,
  setPendingCount: (count) => set({ pendingCount: count }),

  lastSyncedAt: null,
  setLastSyncedAt: (date) => set({ lastSyncedAt: date }),

  isSyncing: false,
  setIsSyncing: (syncing) => set({ isSyncing: syncing }),
}))

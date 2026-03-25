import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark' | 'system'

export interface UiStore {
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void

  theme: Theme
  setTheme: (theme: Theme) => void

  activeModal: string | null
  openModal: (id: string) => void
  closeModal: () => void

  isPurchaseModalOpen: boolean
  openPurchaseModal: () => void
  closePurchaseModal: () => void
}

export const useUiStore = create<UiStore>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      theme: 'system' as Theme,
      setTheme: (theme) => set({ theme }),

      activeModal: null,
      openModal: (id) => set({ activeModal: id }),
      closeModal: () => set({ activeModal: null }),

      isPurchaseModalOpen: false,
      openPurchaseModal: () => set({ isPurchaseModalOpen: true }),
      closePurchaseModal: () => set({ isPurchaseModalOpen: false }),
    }),
    {
      name: 'lawket-ui',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        theme: state.theme,
      }),
    },
  ),
)

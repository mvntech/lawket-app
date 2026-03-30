'use client'

import { Sidebar } from './sidebar'
import { MobileNav } from './mobile-nav'
import { TopBar } from './top-bar'
import { OfflineBanner } from './offline-banner'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden md:flex md:shrink-0">
        <Sidebar />
      </div>
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <OfflineBanner />

        <TopBar />

        <main className="flex-1 flex flex-col overflow-y-auto pb-16 md:pb-0">
          {children}
        </main>

        <div className="md:hidden fixed bottom-0 inset-x-0 z-10">
          <MobileNav />
        </div>
      </div>
    </div>
  )
}

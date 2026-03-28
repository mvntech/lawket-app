'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  User, Shield, Bell, Palette,
  Trash2, CreditCard, ArchiveRestore, ChevronRight,
} from 'lucide-react'
import { SettingsSidebar } from '@/components/layout/settings-sidebar'
import { ROUTES } from '@/lib/constants/routes'
import { useCredits } from '@/hooks/use-credits'

// Mobile-only nav list (mirrors SettingsSidebar, kept separate to avoid
// double-rendering the sidebar component on mobile)
const MOBILE_NAV = [
  { label: 'Profile', href: ROUTES.settings.profile, icon: User },
  { label: 'Security', href: ROUTES.settings.security, icon: Shield },
  { label: 'Notifications', href: ROUTES.settings.notifications, icon: Bell },
  { label: 'Appearance', href: ROUTES.settings.appearance, icon: Palette },
  { label: 'Deleted cases', href: ROUTES.settings.deletedCases, icon: ArchiveRestore },
  { label: 'Credits', href: ROUTES.settings.credits, icon: CreditCard },
  { label: 'Account', href: ROUTES.settings.account, icon: Trash2 },
] as const

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isRoot = pathname === ROUTES.settings.root
  const { data: creditsData } = useCredits()
  const balance = creditsData?.balance

  return (
    <>
      <div className="hidden md:flex fixed inset-0 z-40 bg-background">
        <SettingsSidebar />
        <main className="flex-1 min-w-0 overflow-y-auto">
          {children}
        </main>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden md:hidden">
        {isRoot ? (
          <nav
            className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
            aria-label="Settings navigation"
          >
            {MOBILE_NAV.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href as any}
                className="flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <span>{label}</span>
                  {label === 'Credits' && balance !== undefined && (
                    <p className="text-xs text-muted-foreground font-normal">
                      {balance} credits remaining
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </Link>
            ))}
          </nav>
        ) : (
          <main className="flex-1 overflow-y-auto">{children}</main>
        )}
      </div>
    </>
  )
}

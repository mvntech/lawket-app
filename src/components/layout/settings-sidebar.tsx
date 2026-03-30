'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArrowLeft,
  User,
  Shield,
  Bell,
  Palette,
  ArchiveRestore,
  Trash2,
  Sun,
  Moon,
  Monitor,
  Coins,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { ROUTES } from '@/lib/constants/routes'
import { useTheme } from 'next-themes'
import { useProfile } from '@/hooks/use-settings'
import { useCredits } from '@/hooks/use-credits'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

// nav definition

const NAV = [
  { label: 'Profile', href: ROUTES.settings.profile, icon: User },
  { label: 'Security', href: ROUTES.settings.security, icon: Shield },
  { label: 'Notifications', href: ROUTES.settings.notifications, icon: Bell },
  { label: 'Appearance', href: ROUTES.settings.appearance, icon: Palette },
  { label: 'Deleted cases', href: ROUTES.settings.deletedCases, icon: ArchiveRestore },
  { label: 'Credits', href: ROUTES.settings.credits, icon: Coins },
  { label: 'Account', href: ROUTES.settings.account, icon: Trash2 },
] as const

// component

export function SettingsSidebar() {
  const pathname = usePathname()
  const { data: profile } = useProfile()
  const { data: creditsData } = useCredits()
  const { theme, setTheme, resolvedTheme } = useTheme()

  const balance = creditsData?.balance ?? 0

  const ThemeIcon =
    theme === 'system' ? Monitor : resolvedTheme === 'dark' ? Moon : Sun

  const cycleTheme = () => {
    const order = ['light', 'dark', 'system'] as const
    const idx = order.indexOf((theme ?? 'system') as typeof order[number])
    setTheme(order[(idx + 1) % order.length])
  }

  const initials = profile?.full_name
    ? profile.full_name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
    : '?'

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  return (
    <aside className="flex flex-col h-full w-64 border-r bg-sidebar shrink-0">

      <div className="px-3 py-4 border-b">
        <Link
          href={ROUTES.dashboard}
          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto pb-2 mt-2" aria-label="Settings navigation">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href /* eslint-disable-line @typescript-eslint/no-explicit-any */}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/10 text-primary border-l-2 border-primary rounded-l-none'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="flex-1">{label}</span>
              {label === 'Credits' && (
                <span
                  className={cn(
                    'text-xs tabular-nums',
                    active ? 'text-primary/70' : 'text-muted-foreground',
                  )}
                  aria-label={`${balance} credits`}
                >
                  {balance > 0 ? balance : '0'}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <Separator />

      <div className="px-3 py-2.5 flex items-center gap-2">
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.full_name ?? ''} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <p className="flex-1 min-w-0 text-xs text-muted-foreground truncate">
          {profile?.full_name ?? ''}
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={cycleTheme}
          aria-label={`Theme: ${theme}. Click to cycle.`}
        >
          <ThemeIcon className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

    </aside>
  )
}

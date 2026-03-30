'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LogOut, Settings, Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from 'next-themes'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/use-auth'
import { useProfile } from '@/hooks/use-settings'
import { ROUTES } from '@/lib/constants/routes'

const PAGE_TITLES: Record<string, string> = {
  [ROUTES.dashboard]: 'Dashboard',
  [ROUTES.cases.list]: 'Cases',
  [ROUTES.calendar]: 'Calendar',
  [ROUTES.documents]: 'Documents',
  [ROUTES.contacts.list]: 'Contacts',
  [ROUTES.notifications]: 'Notifications',
  [ROUTES.ai]: 'AI Assistant',
  [ROUTES.settings.root]: 'Settings',
  [ROUTES.settings.profile]: 'Profile',
  [ROUTES.settings.security]: 'Security',
  [ROUTES.settings.notifications]: 'Notification Settings',
  [ROUTES.settings.appearance]: 'Appearance',
  [ROUTES.settings.credits]: 'Credits',
  [ROUTES.settings.deletedCases]: 'Deleted Cases',
  [ROUTES.settings.account]: 'Account',
}

function getTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  if (pathname.startsWith(ROUTES.cases.list)) return 'Cases'
  if (pathname.startsWith(ROUTES.contacts.list)) return 'Contacts'
  if (pathname.startsWith(ROUTES.settings.root)) return 'Settings'
  return 'Lawket'
}


interface TopBarProps {
  actions?: React.ReactNode
}

export function TopBar({ actions }: TopBarProps) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const { data: profile } = useProfile()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const title = getTitle(pathname)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // before mount, use monitor as a neutral placeholder to match SSR output
  const ThemeIcon = !mounted
    ? Monitor
    : theme === 'system'
      ? Monitor
      : resolvedTheme === 'dark'
        ? Moon
        : Sun

  const themeLabel = mounted ? theme : 'system'

  const cycleTheme = () => {
    const order = ['light', 'dark', 'system'] as const
    const current = (theme ?? 'system') as typeof order[number]
    setTheme(order[(order.indexOf(current) + 1) % order.length])
  }

  const initials = profile?.full_name
    ? profile.full_name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
    : '?'

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b bg-background md:hidden">
      <div className="flex items-center gap-2">
        <Image src="/icons/icon-192.png" alt="Logo" width={24} height={24} />
        <h1 className="text-base font-semibold truncate">Lawket</h1>
      </div>

      <div className="flex items-center gap-1">
        {actions}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-foreground"
          onClick={cycleTheme}
          aria-label={`Theme: ${themeLabel}. Click to cycle.`}
        >
          <ThemeIcon className="h-5 w-5" />
        </Button>
        <NotificationBell userId={user?.id ?? ''} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 rounded-full focus:outline-none focus:ring-2 focus:ring-ring" aria-label="Account menu">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.full_name ?? ''} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-2">
              <p className="text-sm font-medium truncate">{profile?.full_name ?? '-'}</p>
              <p className="text-xs text-muted-foreground truncate">{profile?.email ?? ''}</p>
            </div>

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link href={ROUTES.settings.root /* eslint-disable-line @typescript-eslint/no-explicit-any */} className="cursor-pointer">
                <Settings className="h-4 w-4 mr-2 text-muted-foreground" aria-hidden="true" />
                Settings
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => signOut().catch(() => undefined)}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Briefcase,
  Calendar,
  FileText,
  Users,
  LogOut,
  Bell,
  Sun,
  Moon,
  Monitor,
  Settings,
  Sparkles,
  MoreVertical,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { ROUTES } from '@/lib/constants/routes'
import { useAuth } from '@/hooks/use-auth'
import { useProfile } from '@/hooks/use-settings'
import { useSyncStore } from '@/stores/sync.store'
import { useUiStore } from '@/stores/ui.store'
import { useTheme } from 'next-themes'
import { useUnreadNotificationCount } from '@/hooks/use-notifications'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { CreditBalance } from '@/components/credits/credit-balance'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Route } from 'next'

// navLink

function NavLink({
  href,
  icon: Icon,
  label,
  badge,
  isActive,
}: {
  href: string
  icon: React.ElementType
  label: string
  badge?: number
  isActive: boolean
}) {
  return (
    <Link
      href={href as Route}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary/10 text-primary border-l-2 border-primary rounded-l-none'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </Link>
  )
}

// sectionLabel

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="mt-3 mb-1 px-3 text-[10px] fonttracking-widest text-muted-foreground/60 select-none">
      {label}
    </p>
  )
}

// sidebar

export function Sidebar() {
  const pathname = usePathname()
  const { user, signOut, signOutStatus } = useAuth()
  const { data: profile } = useProfile()
  const isSigningOut = signOutStatus === 'pending'
  const { isOnline, isSyncing } = useSyncStore()
  const openPurchaseModal = useUiStore((s) => s.openPurchaseModal)
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  const { data: unreadCount = 0 } = useUnreadNotificationCount(user?.id ?? '')

  const ThemeIcon = !mounted
    ? Monitor
    : theme === 'system'
      ? Monitor
      : resolvedTheme === 'dark'
        ? Moon
        : Sun
  const themeAriaLabel = !mounted ? 'Toggle theme' : `Theme: ${theme}. Click to cycle.`
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

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <aside className="flex flex-col h-full w-64 border-r bg-sidebar">
      <div className="flex h-20 items-center gap-4 px-5">
        <div className="relative group">
          <div className="relative flex h-12 w-12 items-center justify-center">
            <Image
              src="/icons/icon-192.png"
              alt="Lawket"
              width={44}
              height={44}
              className="object-contain"
            />
          </div>
        </div>

        <div className="flex flex-col">
          <h1 className="text-xl font-bold tracking-tight text-foreground leading-none mb-1">
            Lawket
          </h1>
          <span className="text-xs text-muted-foreground leading-none">
            Your Pocket Counsel
          </span>
        </div>
      </div>

      <nav className="flex-1 px-2 py-2 space-y-1 overflow-y-auto">
        <NavLink
          href={ROUTES.dashboard}
          icon={LayoutDashboard}
          label="Dashboard"
          isActive={isActive(ROUTES.dashboard)}
        />
        <NavLink
          href={ROUTES.cases.list}
          icon={Briefcase}
          label="Cases"
          isActive={isActive(ROUTES.cases.list)}
        />
        <NavLink
          href={ROUTES.calendar}
          icon={Calendar}
          label="Calendar"
          isActive={isActive(ROUTES.calendar)}
        />
        <NavLink
          href={ROUTES.contacts.list}
          icon={Users}
          label="Contacts"
          isActive={isActive(ROUTES.contacts.list)}
        />
        <NavLink
          href={ROUTES.documents}
          icon={FileText}
          label="Documents"
          isActive={isActive(ROUTES.documents)}
        />
        <NavLink
          href={ROUTES.ai}
          icon={Sparkles}
          label="AI Assistant"
          isActive={isActive(ROUTES.ai)}
        />
        <NavLink
          href={ROUTES.notifications}
          icon={Bell}
          label="Notifications"
          badge={unreadCount}
          isActive={isActive(ROUTES.notifications)}
        />
      </nav>

      <Separator />

      <div className="px-2 py-2">
        <button
          type="button"
          onClick={openPurchaseModal}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-accent transition-colors group"
        >
          <CreditBalance size="sm" showLabel={true} />
          <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            Get more →
          </span>
        </button>
      </div>

      <Separator />

      <div className="px-3 py-2 flex items-center gap-2">
        <span
          className={cn(
            'h-2 w-2 rounded-full shrink-0',
            !isOnline ? 'bg-destructive' : isSyncing ? 'bg-amber-500' : 'bg-emerald-500',
          )}
          aria-hidden="true"
        />
        <span className="flex-1 text-xs text-muted-foreground">
          {!isOnline ? 'Offline' : isSyncing ? 'Syncing…' : 'Synced'}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={cycleTheme}
          aria-label={themeAriaLabel}
        >
          <ThemeIcon className="h-4 w-4" />
        </Button>
      </div>

      <Separator />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div
            role="button"
            tabIndex={0}
            className="flex items-center gap-3 px-3 py-3 w-full text-left transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
            aria-label="Account menu"
          >
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.full_name ?? ''} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile?.full_name ?? '-'}</p>
              <p className="text-xs text-muted-foreground truncate">{profile?.email ?? ''}</p>
            </div>
            <MoreVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent side="right" align="start" className="w-56 mb-1">
          <div className="px-2 py-2 flex items-center gap-2">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.full_name ?? ''} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{profile?.full_name ?? '-'}</p>
              <p className="text-xs text-muted-foreground truncate">{profile?.email ?? ''}</p>
            </div>
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuItem asChild>
            <Link href={ROUTES.settings.profile /* eslint-disable-line @typescript-eslint/no-explicit-any */} className="cursor-pointer">
              <Settings className="h-4 w-4 mr-2 text-muted-foreground" aria-hidden="true" />
              Settings
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => signOut().catch(() => undefined)}
            disabled={isSigningOut}
            className="text-destructive focus:text-destructive cursor-pointer"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </aside>
  )
}

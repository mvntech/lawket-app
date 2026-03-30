'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Briefcase, Calendar, FileText, Users } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { ROUTES } from '@/lib/constants/routes'

interface MobileNavProps {
  activeCasesCount?: number
}

const navItems = [
  { label: 'Dashboard', href: ROUTES.dashboard, icon: LayoutDashboard },
  { label: 'Cases', href: ROUTES.cases.list, icon: Briefcase },
  { label: 'Calendar', href: ROUTES.calendar, icon: Calendar },
  { label: 'Documents', href: ROUTES.documents, icon: FileText },
  { label: 'Contacts', href: ROUTES.contacts.list, icon: Users },
]

export function MobileNav({ activeCasesCount = 0 }: MobileNavProps) {
  const pathname = usePathname()

  return (
    <nav
      className="bg-background border-t flex items-stretch"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {navItems.map(({ label, href, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/')
        const showBadge = label === 'Cases' && activeCasesCount > 0

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center min-h-[44px] py-2 gap-0.5 text-xs transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <div className="relative">
              <Icon className="h-5 w-5" />
              {showBadge && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
              )}
            </div>
            {isActive && <span>{label}</span>}
          </Link>
        )
      })}
    </nav>
  )
}

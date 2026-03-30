import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  backHref?: string | React.ComponentPropsWithoutRef<typeof Link>['href']
  className?: string
}

export function PageHeader({ title, subtitle, action, backHref, className }: PageHeaderProps) {
  return (
    <div className={cn('border-b bg-background p-4 md:px-6 sticky top-0 z-50', className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          {backHref && (
            <Link
              href={backHref as any}
              className="shrink-0 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Go back"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-foreground truncate">{title}</h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  )
}

'use client'

import { Building2, Mail, Pencil, Trash2 } from 'lucide-react'
import { ContactAvatar } from './contact-avatar'
import { RoleBadge } from './role-badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import type { ContactModel } from '@/types/common.types'

interface ContactCardProps {
  contact: ContactModel
  onClick?: () => void
  onEdit?: () => void
  onDelete?: () => void
  compact?: boolean
}

export function ContactCard({
  contact,
  onClick,
  onEdit,
  onDelete,
  compact = false,
}: ContactCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onClick()
    }
  }

  if (compact) {
    return (
      <div
        role="listitem"
        aria-label={`Contact: ${contact.full_name}`}
        className="flex items-center gap-3 py-2"
      >
        <ContactAvatar name={contact.full_name} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">{contact.full_name}</p>
          <RoleBadge role={contact.role} size="sm" />
        </div>
        {(onEdit || onDelete) && (
          <div className="flex items-center gap-1 shrink-0">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => { e.stopPropagation(); onEdit() }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                onClick={(e) => { e.stopPropagation(); onDelete() }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      role={onClick ? 'button' : 'listitem'}
      aria-label={`Contact: ${contact.full_name}`}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'group relative rounded-lg border bg-card p-4 transition-shadow duration-200',
        onClick && 'cursor-pointer hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      {(onEdit || onDelete) && (
        <div
          className="absolute top-3 right-3 flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {onEdit && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}

      <div className="flex items-start gap-3">
        <ContactAvatar name={contact.full_name} size="md" className="shrink-0" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground truncate pr-16">
            {contact.full_name}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground truncate">
            {contact.phone || 'N/A'}
          </p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t flex items-center gap-3 text-xs text-muted-foreground">
        <RoleBadge role={contact.role} size="sm" />

        {contact.email && (
          <span className="flex items-center gap-1 min-w-0 truncate">
            <Mail className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{contact.email}</span>
          </span>
        )}

        {contact.organization && (
          <span className="ml-auto flex items-center gap-1 shrink-0">
            <Building2 className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{contact.organization}</span>
          </span>
        )}
      </div>
    </div>
  )
}
import { Building2, Mail, Phone, Pencil, Trash2 } from 'lucide-react'
import { ContactAvatar } from './contact-avatar'
import { RoleBadge } from './role-badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import type { ContactModel } from '@/types/common.types'

// props

interface ContactCardProps {
  contact: ContactModel
  onClick?: () => void
  onEdit?: () => void
  onDelete?: () => void
  showCaseLink?: boolean
  compact?: boolean
}

// component

export function ContactCard({
  contact,
  onClick,
  onEdit,
  onDelete,
  compact = false,
}: ContactCardProps) {
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
                aria-label={`Edit ${contact.full_name}`}
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => { e.stopPropagation(); onDelete() }}
                aria-label={`Remove ${contact.full_name}`}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      role="listitem"
      aria-label={`Contact: ${contact.full_name}`}
      className={cn(
        'group flex items-start gap-3 p-4 rounded-lg border bg-card transition-colors',
        onClick && 'cursor-pointer hover:bg-accent/30',
      )}
      onClick={onClick}
    >
      <ContactAvatar name={contact.full_name} size="md" />

      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-semibold text-foreground">{contact.full_name}</p>
        <RoleBadge role={contact.role} />

        {contact.organization && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{contact.organization}</span>
          </div>
        )}

        {(contact.email || contact.phone) && (
          <div className="flex flex-col gap-0.5 mt-1">
            {contact.email && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{contact.email}</span>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span>{contact.phone}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div
        className={cn(
          'flex items-center gap-1 shrink-0',
          'opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {onEdit && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onEdit}
            aria-label={`Edit ${contact.full_name}`}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
            aria-label={`Delete ${contact.full_name}`}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  )
}

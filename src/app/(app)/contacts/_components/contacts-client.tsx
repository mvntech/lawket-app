'use client'

import { useRef, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Users, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { ListSkeleton } from '@/components/shared/loading-skeleton'
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog'
import { FormPanel } from '@/components/shared/form-panel'
import { FormPanelFooter } from '@/components/shared/form-panel-footer'
import { ContactCard } from '@/components/contacts/contact-card'
import { ContactForm } from '@/components/contacts/contact-form'
import type { ContactFormHandle } from '@/components/contacts/contact-form'
import { useContacts, useSoftDeleteContact } from '@/hooks/use-contacts'
import { ROUTES } from '@/lib/constants/routes'
import type { ContactModel, ContactRole } from '@/types/common.types'

// role filter options

const ROLE_FILTERS: { value: ContactRole | 'all'; label: string }[] = [
  { value: 'all', label: 'All roles' },
  { value: 'client', label: 'Client' },
  { value: 'opposing_counsel', label: 'Opposing counsel' },
  { value: 'judge', label: 'Judge' },
  { value: 'witness', label: 'Witness' },
  { value: 'expert', label: 'Expert' },
  { value: 'court_staff', label: 'Court staff' },
  { value: 'other', label: 'Other' },
]

// props

interface ContactsClientProps {
  initialContacts: ContactModel[]
}

// component

export function ContactsClient({ initialContacts }: ContactsClientProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<ContactRole | 'all'>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [deletingContact, setDeletingContact] = useState<ContactModel | null>(null)

  const [editingContact, setEditingContact] = useState<ContactModel | null>(null)
  const [editLoading, setEditLoading] = useState(false)

  const addFormRef = useRef<ContactFormHandle>(null)
  const editFormRef = useRef<ContactFormHandle>(null)

  const { data: contacts, isLoading, error, refetch } = useContacts()
  const softDelete = useSoftDeleteContact()

  const allContacts = contacts ?? initialContacts

  const filtered = useMemo(() => {
    let result = allContacts
    if (roleFilter !== 'all') {
      result = result.filter((c) => c.role === roleFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      result = result.filter(
        (c) =>
          c.full_name.toLowerCase().includes(q) ||
          (c.organization ?? '').toLowerCase().includes(q) ||
          (c.email ?? '').toLowerCase().includes(q),
      )
    }
    return result
  }, [allContacts, search, roleFilter])

  const grouped = useMemo(() => {
    const map = new Map<string, ContactModel[]>()
    for (const c of filtered) {
      const letter = (c.full_name[0] ?? '#').toUpperCase()
      const group = map.get(letter) ?? []
      group.push(c)
      map.set(letter, group)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  const handleDelete = async () => {
    if (!deletingContact) return
    await softDelete.mutateAsync(deletingContact.id)
    setDeletingContact(null)
  }

  if (isLoading && !initialContacts.length) return <ListSkeleton count={5} />
  if (error && !initialContacts.length) return <ErrorState onRetry={() => refetch()} />

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <PageHeader
        title="Contacts"
        subtitle="Manage contacts, clients, and other relevant parties"
        action={
          <Button variant="outline" size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add contact
          </Button>
        }
      />

      <div className="flex-1 px-4 md:px-6 pb-6 pt-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as ContactRole | 'all')}>
            <SelectTrigger className="h-8 text-xs w-auto min-w-[120px]" aria-label="Filter by role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_FILTERS.map(({ value, label }) => (
                <SelectItem key={value} value={value} className="text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-xs text-muted-foreground ml-auto shrink-0">
            {filtered.length} {filtered.length === 1 ? 'contact' : 'contacts'}
          </span>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No contacts yet"
            subtitle="Add clients, opposing counsel, judges and other contacts."
            ctaLabel="Add contact"
            onCta={() => setAddOpen(true)}
          />
        ) : (
          <div role="list" className="space-y-4">
            {grouped.map(([letter, contacts]) => (
              <div key={letter}>
                <p className="sticky top-0 z-10 bg-background px-1 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {letter}
                </p>
                <div className="grid gap-3">
                  {contacts.map((contact) => (
                    <ContactCard
                      key={contact.id}
                      contact={contact}
                      onClick={() => router.push(ROUTES.contacts.detail(contact.id))}
                      onEdit={() => setEditingContact(contact)}
                      onDelete={() => setDeletingContact(contact)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setAddOpen(true)}
        className="fixed bottom-20 z-50 right-8 flex items-center justify-center h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Add contact"
      >
        <Plus className="h-6 w-6" aria-hidden="true" />
      </button>

      <FormPanel
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add contact"
        subtitle="Add a client, judge, or counsel to your contacts"
        size="md"
        isLoading={addLoading}
        footer={
          <FormPanelFooter
            onCancel={() => setAddOpen(false)}
            submitLabel="Add contact"
            isLoading={addLoading}
            onSubmit={() => addFormRef.current?.submit()}
          />
        }
      >
        <ContactForm
          ref={addFormRef}
          mode="create"
          hideSubmitButton
          onLoadingChange={setAddLoading}
          onSuccess={() => setAddOpen(false)}
        />
      </FormPanel>

      <FormPanel
        isOpen={!!editingContact}
        onClose={() => setEditingContact(null)}
        title="Edit contact"
        subtitle="Update this contact's details"
        size="md"
        isLoading={editLoading}
        footer={
          <FormPanelFooter
            onCancel={() => setEditingContact(null)}
            submitLabel="Save changes"
            isLoading={editLoading}
            onSubmit={() => editFormRef.current?.submit()}
          />
        }
      >
        {editingContact && (
          <ContactForm
            ref={editFormRef}
            mode="edit"
            initialData={editingContact}
            hideSubmitButton
            onLoadingChange={setEditLoading}
            onSuccess={() => setEditingContact(null)}
          />
        )}
      </FormPanel>

      <DeleteConfirmDialog
        open={!!deletingContact}
        onOpenChange={(open) => !open && setDeletingContact(null)}
        onConfirm={handleDelete}
        itemType="contact"
        itemName={deletingContact?.full_name ?? ''}
        isLoading={softDelete.isPending}
      />
    </div>
  )
}

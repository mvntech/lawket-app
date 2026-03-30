'use client'

import { useState, useCallback } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { Check, ChevronsUpDown, UserPlus, X, Loader2, Pencil } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RoleBadge } from '@/components/contacts/role-badge'
import { FormPanel } from '@/components/shared/form-panel'
import { ContactForm } from '@/components/contacts/contact-form'
import { zodResolver } from '@/lib/utils/form'
import { useContacts, useCreateContact } from '@/hooks/use-contacts'
import type { ContactModel } from '@/hooks/use-contacts'
import type { ContactRole } from '@/types/common.types'
import { cn } from '@/lib/utils/cn'

const miniSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(200),
  phone: z.string().max(20).optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
})
type MiniInput = z.infer<typeof miniSchema>

export interface ContactComboboxProps {
  id?: string
  role: ContactRole
  roleLabel: string
  placeholder: string
  value: string
  onChange: (name: string) => void
  onContactChange: (contact: ContactModel | null) => void
  selectedContactId?: string | null
  onAutoFill?: (phone: string | null, email: string | null) => void
  error?: string
}

export function ContactCombobox({
  id,
  role,
  roleLabel,
  placeholder,
  value,
  onChange,
  onContactChange,
  selectedContactId,
  onAutoFill,
  error,
}: ContactComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [editContact, setEditContact] = useState<ContactModel | null>(null)

  // fetch all contacts of this role for the dropdown (high page size for combobox use)
  const { data: contacts = [] } = useContacts({ role, pageSize: 200 })

  // resolve full contact object for the selected ID so we can pre-fill the edit form
  const selectedContact = contacts.find((c) => c.id === selectedContactId) ?? null
  const createContact = useCreateContact()

  const filtered = contacts.filter((c) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      c.full_name.toLowerCase().includes(q) ||
      (c.organization ?? '').toLowerCase().includes(q)
    )
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors: miniErrors },
  } = useForm<MiniInput>({
    resolver: zodResolver(miniSchema),
    defaultValues: { full_name: '', phone: '', email: '' },
  })

  const handleSelect = useCallback(
    (contact: ContactModel) => {
      onChange(contact.full_name)
      onContactChange(contact)
      onAutoFill?.(contact.phone ?? null, contact.email ?? null)
      setOpen(false)
      setSearch('')
    },
    [onChange, onContactChange, onAutoFill],
  )

  const handleOpenCreate = (initialName: string) => {
    setOpen(false)
    reset({ full_name: initialName, phone: '', email: '' })
    setCreating(true)
  }

  const handleCancelCreate = () => {
    setCreating(false)
    reset()
  }

  const handleClear = () => {
    onChange('')
    onContactChange(null)
    setSearch('')
    setCreating(false)
    reset()
  }

  const onMiniSubmit = async (data: MiniInput) => {
    try {
      const contact = await createContact.mutateAsync({
        full_name: data.full_name,
        role,
        phone: data.phone || undefined,
        email: data.email || undefined,
      })
      onChange(contact.full_name)
      onContactChange(contact)
      onAutoFill?.(contact.phone ?? null, contact.email ?? null)
      setCreating(false)
      reset()
    } catch {
      // mutation onError already shows a toast
    }
  }

  return (
    <div className="space-y-2">
      {selectedContactId ? (
        <div className="flex items-center gap-2 h-9 rounded-md border bg-muted/40 px-3">
          <span className="flex-1 text-sm font-medium truncate">{value || roleLabel}</span>
          <RoleBadge role={role} />
          <button
            type="button"
            onClick={() => setEditContact(selectedContact)}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`Edit ${roleLabel}`}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
            aria-label={`Clear ${roleLabel}`}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              role="combobox"
              id={id}
              aria-expanded={open}
              className={cn(
                'flex h-9 w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-sm',
                'ring-offset-background transition-colors',
                'hover:bg-muted/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                error && 'border-destructive',
                !value && 'text-muted-foreground',
              )}
            >
              <span className="truncate">{value || placeholder}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </button>
          </PopoverTrigger>

          <PopoverContent
            className="p-0"
            align="start"
            style={{ width: 'var(--radix-popover-trigger-width)' }}
          >
            <div className="border-b p-2">
              <input
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder={`Search ${roleLabel.toLowerCase()}…`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>

            <div className="max-h-56 overflow-y-auto py-1">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelect(c)}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors',
                    c.id === selectedContactId && 'text-primary',
                  )}
                >
                  <Check
                    className={cn(
                      'h-3.5 w-3.5 shrink-0',
                      c.id === selectedContactId ? 'opacity-100' : 'opacity-0',
                    )}
                    aria-hidden="true"
                  />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="truncate">{c.full_name}</p>
                    {c.organization && (
                      <p className="text-xs text-muted-foreground truncate">{c.organization}</p>
                    )}
                  </div>
                </button>
              ))}

              {filtered.length === 0 && (
                <p className="px-3 py-3 text-sm text-muted-foreground text-center">
                  {search ? `No ${roleLabel.toLowerCase()} found.` : `No ${roleLabel.toLowerCase()} contacts yet.`}
                </p>
              )}
            </div>

            <div className="border-t p-1">
              <button
                type="button"
                onClick={() => handleOpenCreate(search.trim())}
                className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-primary hover:bg-accent transition-colors"
              >
                <UserPlus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {search.trim()
                  ? `Add "${search.trim()}" as ${roleLabel}`
                  : `Add new ${roleLabel}`}
              </button>
            </div>
          </PopoverContent>
        </Popover>
      )}

      <FormPanel
        isOpen={!!editContact}
        onClose={() => setEditContact(null)}
        title={`Edit ${roleLabel}`}
        subtitle="Changes will update the contact everywhere it is used."
        size="sm"
      >
        {editContact && (
          <ContactForm
            mode="edit"
            initialData={editContact}
            onSuccess={(updated) => {
              onChange(updated.full_name)
              onContactChange(updated)
              onAutoFill?.(updated.phone ?? null, updated.email ?? null)
              setEditContact(null)
            }}
            onCancel={() => setEditContact(null)}
          />
        )}
      </FormPanel>

      <AnimatePresence initial={false}>
        {creating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div
              className="rounded-md border bg-muted/30 p-3 space-y-3"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void handleSubmit(onMiniSubmit)()
                }
              }}
            >
              <div className="flex items-center gap-2">
                <RoleBadge role={role} />
                <span className="text-xs text-muted-foreground">New {roleLabel}</span>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">
                  Full name <span className="text-destructive" aria-hidden="true">*</span>
                </Label>
                <Input
                  className="h-8 text-sm"
                  placeholder={`${roleLabel} full name`}
                  aria-invalid={!!miniErrors.full_name}
                  {...register('full_name')}
                  autoFocus
                />
                {miniErrors.full_name && (
                  <p className="text-xs text-destructive">{miniErrors.full_name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Phone</Label>
                  <Input
                    type="tel"
                    className="h-8 text-sm"
                    placeholder="+92 300 1234567"
                    {...register('phone')}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    className="h-8 text-sm"
                    placeholder="email@example.com"
                    aria-invalid={!!miniErrors.email}
                    {...register('email')}
                  />
                  {miniErrors.email && (
                    <p className="text-xs text-destructive">{miniErrors.email.message}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleCancelCreate}
                  disabled={createContact.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={createContact.isPending}
                  onClick={() => void handleSubmit(onMiniSubmit)()}
                >
                  {createContact.isPending && (
                    <Loader2 className="mr-1.5 h-3 w-3 animate-spin" aria-hidden="true" />
                  )}
                  Add {roleLabel}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

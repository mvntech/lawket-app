'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { ChevronDown, ChevronUp, Loader2, Users, X, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CaseStatusSelect } from '@/components/cases/case-status-select'
import { RoleBadge } from '@/components/contacts/role-badge'
import { ContactCombobox } from '@/components/cases/contact-combobox'
import { CaseDocumentsPanel } from '@/components/cases/case-documents-panel'
import type { CaseDocumentsPanelHandle } from '@/components/cases/case-documents-panel'
import { FormPanel } from '@/components/shared/form-panel'
import { ContactForm } from '@/components/contacts/contact-form'
import { zodResolver } from '@/lib/utils/form'
import { createCaseSchema } from '@/lib/validations/case.schema'
import type { CreateCaseInput } from '@/lib/validations/case.schema'
import { useCreateCase, useUpdateCase } from '@/hooks/use-cases'
import {
  useContacts,
  useContactsByCase,
  useLinkContactToCase,
  useUnlinkContactFromCase,
} from '@/hooks/use-contacts'
import type { ContactModel } from '@/hooks/use-contacts'
import { useAuth } from '@/hooks/use-auth'
import { ROUTES } from '@/lib/constants/routes'
import type { CaseModel } from '@/services/cases.service'
import type { CaseStatus, CaseType, ContactRole } from '@/types/common.types'

// ── types ──────────────────────────────────────────────────────────────────────

interface CaseFormProps {
  mode: 'create' | 'edit'
  initialData?: CaseModel
  onSuccess?: (c: CaseModel) => void
}

// Roles that have dedicated inline comboboxes - excluded from the generic linker
const ROLE_COMBOBOX = new Set<ContactRole>(['client', 'judge', 'opposing_counsel'])

const CASE_TYPE_OPTIONS: { value: CaseType; label: string }[] = [
  { value: 'civil', label: 'Civil' },
  { value: 'criminal', label: 'Criminal' },
  { value: 'family', label: 'Family' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'property', label: 'Property' },
  { value: 'constitutional', label: 'Constitutional' },
  { value: 'tax', label: 'Tax' },
  { value: 'labour', label: 'Labour' },
  { value: 'other', label: 'Other' },
]

// ── component ──────────────────────────────────────────────────────────────────

export function CaseForm({ mode, initialData, onSuccess }: CaseFormProps) {
  const router = useRouter()
  const { user } = useAuth()
  const createCase = useCreateCase()
  const updateCase = useUpdateCase()
  const [showMore, setShowMore] = useState(mode === 'edit')
  const [showContacts, setShowContacts] = useState(mode === 'edit')
  const [createContactOpen, setCreateContactOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const docsPanelRef = useRef<CaseDocumentsPanelHandle>(null)

  // ── Contact linking ──────────────────────────────────────────────────────
  const { data: allContacts = [] } = useContacts()
  const { data: linkedContacts = [] } = useContactsByCase(initialData?.id ?? '')
  const linkContact = useLinkContactToCase()
  const unlinkContact = useUnlinkContactFromCase()

  // Role-specific contacts selected via the inline comboboxes
  const [clientContact, setClientContact] = useState<ContactModel | null>(null)
  const [judgeContact, setJudgeContact] = useState<ContactModel | null>(null)
  const [opposingContact, setOpposingContact] = useState<ContactModel | null>(null)

  // Initialise role contacts from linkedContacts when editing
  useEffect(() => {
    if (mode !== 'edit' || !linkedContacts.length) return
    const client = linkedContacts.find((c) => c.role === 'client') ?? null
    const judge = linkedContacts.find((c) => c.role === 'judge') ?? null
    const opposing = linkedContacts.find((c) => c.role === 'opposing_counsel') ?? null
    if (client) setClientContact(client)
    if (judge) setJudgeContact(judge)
    if (opposing) setOpposingContact(opposing)
  }, [linkedContacts, mode])

  // Generic contacts (witness / expert / court_staff / other)
  const [pendingContactIds, setPendingContactIds] = useState<Set<string>>(new Set())
  const [selectContactId, setSelectContactId] = useState<string>('')

  const linkedIds = useMemo(() => {
    if (mode === 'edit') return new Set(linkedContacts.map((c) => c.id))
    return pendingContactIds
  }, [mode, linkedContacts, pendingContactIds])

  // Only expose non-combobox-role contacts in the generic section
  const availableContacts = useMemo(
    () => allContacts.filter((c) => !linkedIds.has(c.id) && !ROLE_COMBOBOX.has(c.role)),
    [allContacts, linkedIds],
  )

  const genericLinkedContacts = useMemo(() => {
    const displayed = mode === 'edit'
      ? linkedContacts
      : allContacts.filter((c) => pendingContactIds.has(c.id))
    return displayed.filter((c) => !ROLE_COMBOBOX.has(c.role))
  }, [mode, linkedContacts, allContacts, pendingContactIds])

  const isLoading = createCase.isPending || updateCase.isPending || isSubmitting

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isDirty },
  } = useForm<CreateCaseInput>({
    resolver: zodResolver(createCaseSchema),
    defaultValues:
      mode === 'edit' && initialData
        ? {
          case_number: initialData.case_number,
          title: initialData.title,
          client_name: initialData.client_name,
          case_type: initialData.case_type,
          status: initialData.status,
          client_contact: initialData.client_contact ?? '',
          opposing_party: initialData.opposing_party ?? '',
          court_name: initialData.court_name ?? '',
          judge_name: initialData.judge_name ?? '',
          filed_date: initialData.filed_date ?? '',
          description: initialData.description ?? '',
          notes: initialData.notes ?? '',
        }
        : { case_type: 'other', status: 'active' },
  })

  // warn before leaving with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty && !isLoading) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty, isLoading])

  // ── Role-specific contact handlers ──────────────────────────────────────

  function handleClientContactChange(contact: ContactModel | null) {
    if (mode === 'edit' && initialData) {
      if (clientContact) unlinkContact.mutate({ contactId: clientContact.id, caseId: initialData.id })
      if (contact) linkContact.mutate({ contactId: contact.id, caseId: initialData.id })
    }
    setClientContact(contact)
  }

  function handleJudgeContactChange(contact: ContactModel | null) {
    if (mode === 'edit' && initialData) {
      if (judgeContact) unlinkContact.mutate({ contactId: judgeContact.id, caseId: initialData.id })
      if (contact) linkContact.mutate({ contactId: contact.id, caseId: initialData.id })
    }
    setJudgeContact(contact)
  }

  function handleOpposingContactChange(contact: ContactModel | null) {
    if (mode === 'edit' && initialData) {
      if (opposingContact) unlinkContact.mutate({ contactId: opposingContact.id, caseId: initialData.id })
      if (contact) linkContact.mutate({ contactId: contact.id, caseId: initialData.id })
    }
    setOpposingContact(contact)
  }

  // ── Generic contact handlers ─────────────────────────────────────────────

  const handleAddContact = () => {
    if (!selectContactId) return
    if (mode === 'edit' && initialData) {
      linkContact.mutate({ contactId: selectContactId, caseId: initialData.id })
    } else {
      setPendingContactIds((prev) => new Set([...prev, selectContactId]))
    }
    setSelectContactId('')
  }

  const handleRemoveContact = (contactId: string) => {
    if (mode === 'edit' && initialData) {
      unlinkContact.mutate({ contactId, caseId: initialData.id })
    } else {
      setPendingContactIds((prev) => {
        const next = new Set(prev)
        next.delete(contactId)
        return next
      })
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  const onSubmit = async (data: CreateCaseInput) => {
    setIsSubmitting(true)
    try {
      if (mode === 'create') {
        const created = await createCase.mutateAsync(data)

        // Link generic pending contacts
        for (const contactId of pendingContactIds) {
          await linkContact.mutateAsync({ contactId, caseId: created.id }).catch(() => undefined)
        }
        // Link role-specific contacts gathered via comboboxes
        for (const contact of [clientContact, judgeContact, opposingContact]) {
          if (contact) {
            await linkContact.mutateAsync({ contactId: contact.id, caseId: created.id }).catch(() => undefined)
          }
        }

        // Upload any queued documents
        if (user?.id && docsPanelRef.current?.hasPendingFiles()) {
          await docsPanelRef.current.flushUploads(created.id, user.id)
        }

        onSuccess?.(created)
        router.push(ROUTES.cases.detail(created.id))
      } else if (initialData) {
        const updated = await updateCase.mutateAsync({ id: initialData.id, data })
        onSuccess?.(updated)
        router.push(ROUTES.cases.detail(updated.id))
      }
    } catch {
      // errors handled by mutation onError → toast
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {/* ── Case Information ─────────────────────────────────────────────── */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Case Information
        </h2>

        <div className="space-y-1.5">
          <Label htmlFor="case_number">
            Case number <span aria-hidden="true" className="text-destructive">*</span>
          </Label>
          <Input
            id="case_number"
            placeholder="e.g. CR-2026-0441"
            {...register('case_number')}
            aria-invalid={!!errors.case_number}
          />
          {errors.case_number && (
            <p className="text-xs text-destructive">{errors.case_number.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="title">
            Title <span aria-hidden="true" className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            placeholder="e.g. Ahmad v. State"
            {...register('title')}
            aria-invalid={!!errors.title}
          />
          {errors.title && (
            <p className="text-xs text-destructive">{errors.title.message}</p>
          )}
        </div>

        {/* Client - combobox: search existing OR create inline */}
        <div className="space-y-1.5">
          <Label htmlFor="client_name">
            Client <span aria-hidden="true" className="text-destructive">*</span>
          </Label>
          <Controller
            name="client_name"
            control={control}
            render={({ field }) => (
              <ContactCombobox
                id="client_name"
                role="client"
                roleLabel="Client"
                placeholder="Search or add client…"
                value={field.value ?? ''}
                onChange={field.onChange}
                onContactChange={handleClientContactChange}
                selectedContactId={clientContact?.id ?? null}
                onAutoFill={(phone, email) => {
                  setValue('client_contact', phone ?? email ?? '')
                }}
                error={errors.client_name?.message}
              />
            )}
          />
          {errors.client_name && (
            <p className="text-xs text-destructive">{errors.client_name.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="case_type">
              Case type <span aria-hidden="true" className="text-destructive">*</span>
            </Label>
            <Controller
              name="case_type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="case_type" aria-invalid={!!errors.case_type}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CASE_TYPE_OPTIONS.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.case_type && (
              <p className="text-xs text-destructive">{errors.case_type.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="status">
              Status <span aria-hidden="true" className="text-destructive">*</span>
            </Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <CaseStatusSelect
                  value={(field.value ?? 'active') as CaseStatus}
                  onChange={field.onChange}
                />
              )}
            />
            {errors.status && (
              <p className="text-xs text-destructive">{errors.status.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── More details ─────────────────────────────────────────────────── */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <button
          type="button"
          onClick={() => setShowMore((p) => !p)}
          className="w-full flex items-center justify-between px-6 py-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide hover:bg-muted/40 transition-colors"
          aria-expanded={showMore}
        >
          More details
          {showMore
            ? <ChevronUp className="h-4 w-4" aria-hidden="true" />
            : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
        </button>

        {showMore && (
          <div className="px-6 pb-6 space-y-4 border-t">
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="client_contact">Client contact</Label>
                <Input
                  id="client_contact"
                  placeholder="Phone or email"
                  {...register('client_contact')}
                />
              </div>

              {/* Opposing party - combobox */}
              <div className="space-y-1.5">
                <Label htmlFor="opposing_party">Opposing party</Label>
                <Controller
                  name="opposing_party"
                  control={control}
                  render={({ field }) => (
                    <ContactCombobox
                      id="opposing_party"
                      role="opposing_counsel"
                      roleLabel="Opposing counsel"
                      placeholder="Search or add opposing counsel…"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      onContactChange={handleOpposingContactChange}
                      selectedContactId={opposingContact?.id ?? null}
                      error={errors.opposing_party?.message}
                    />
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="court_name">Court name</Label>
                <Input
                  id="court_name"
                  placeholder="e.g. Lahore High Court"
                  {...register('court_name')}
                />
              </div>

              {/* Judge - combobox */}
              <div className="space-y-1.5">
                <Label htmlFor="judge_name">Judge</Label>
                <Controller
                  name="judge_name"
                  control={control}
                  render={({ field }) => (
                    <ContactCombobox
                      id="judge_name"
                      role="judge"
                      roleLabel="Judge"
                      placeholder="Search or add judge…"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      onContactChange={handleJudgeContactChange}
                      selectedContactId={judgeContact?.id ?? null}
                      error={errors.judge_name?.message}
                    />
                  )}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="filed_date">Filed date</Label>
                <Input id="filed_date" type="date" {...register('filed_date')} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={4}
                placeholder="Brief description of the case…"
                {...register('description')}
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={3}
                placeholder="Internal notes…"
                {...register('notes')}
              />
              {errors.notes && (
                <p className="text-xs text-destructive">{errors.notes.message}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Other linked contacts ─────────────────────────────────────────── */}
      {/* Client / judge / opposing counsel are handled by the comboboxes above.
          This section is for witnesses, experts, court staff, and other roles. */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <button
          type="button"
          onClick={() => setShowContacts((p) => !p)}
          className="w-full flex items-center justify-between px-6 py-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide hover:bg-muted/40 transition-colors"
          aria-expanded={showContacts}
        >
          <span className="flex items-center gap-2">
            Other contacts
            {genericLinkedContacts.length > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-primary/15 text-primary text-[10px] font-semibold px-1.5">
                {genericLinkedContacts.length}
              </span>
            )}
          </span>
          {showContacts
            ? <ChevronUp className="h-4 w-4" aria-hidden="true" />
            : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
        </button>

        {showContacts && (
          <div className="px-6 pb-6 space-y-4 border-t">
            {genericLinkedContacts.length > 0 && (
              <div className="mt-4 space-y-1.5">
                {genericLinkedContacts.map((c: ContactModel) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium truncate">{c.full_name}</span>
                      <RoleBadge role={c.role} />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveContact(c.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      aria-label={`Unlink ${c.full_name}`}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {availableContacts.length > 0 && (
              <div className={`flex gap-2${genericLinkedContacts.length === 0 ? ' mt-4' : ''}`}>
                <Select value={selectContactId} onValueChange={setSelectContactId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a contact to link…" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableContacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="font-medium">{c.full_name}</span>
                        <span className="ml-1.5 text-xs text-muted-foreground capitalize">
                          {c.role.replace('_', ' ')}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddContact}
                  disabled={!selectContactId}
                >
                  Link
                </Button>
              </div>
            )}

            {genericLinkedContacts.length === 0 && availableContacts.length === 0 && (
              <p className="mt-4 text-xs text-muted-foreground">
                Add witnesses, experts, or other contacts to this case.
              </p>
            )}

            <button
              type="button"
              onClick={() => setCreateContactOpen(true)}
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
              Create and link new contact
            </button>
          </div>
        )}
      </div>

      <CaseDocumentsPanel
        ref={docsPanelRef}
        mode={mode}
        caseId={initialData?.id}
      />

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="sm:min-w-[120px]">
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          {mode === 'create' ? 'Create case' : 'Save changes'}
        </Button>
      </div>

      {/* ── Create contact panel ─────────────────────────────────────────── */}
      <FormPanel
        isOpen={createContactOpen}
        onClose={() => setCreateContactOpen(false)}
        title="Create contact"
        subtitle="New contact will be linked to this case."
        size="sm"
      >
        <ContactForm
          mode="create"
          onSuccess={(newContact) => {
            setCreateContactOpen(false)
            if (mode === 'edit' && initialData) {
              linkContact.mutate({ contactId: newContact.id, caseId: initialData.id })
            } else {
              setPendingContactIds((prev) => new Set([...prev, newContact.id]))
            }
          }}
          onCancel={() => setCreateContactOpen(false)}
        />
      </FormPanel>
    </form>
  )
}

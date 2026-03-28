'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Phone, Building2, Copy, Trash2, Pencil, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/shared/page-header'
import { ErrorState } from '@/components/shared/error-state'
import { PageSkeleton, ListSkeleton } from '@/components/shared/loading-skeleton'
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog'
import { FormPanel } from '@/components/shared/form-panel'
import { FormPanelFooter } from '@/components/shared/form-panel-footer'
import { ContactAvatar } from '@/components/contacts/contact-avatar'
import { RoleBadge } from '@/components/contacts/role-badge'
import { ContactForm } from '@/components/contacts/contact-form'
import type { ContactFormHandle } from '@/components/contacts/contact-form'
import { CaseCard } from '@/components/cases/case-card'
import {
  useContactDetail,
  useSoftDeleteContact,
  useLinkContactToCase,
  useCasesByContact,
} from '@/hooks/use-contacts'
import { useCases } from '@/hooks/use-cases'
import { ROUTES } from '@/lib/constants/routes'
import type { ContactModel } from '@/types/common.types'
import { cn } from '@/lib/utils/cn'

// props

interface ContactDetailClientProps {
  id: string
  initialData: ContactModel
}

// copy button

function CopyButton({ value }: { value: string }) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success('Copied to clipboard')
    } catch {
      toast.error('Failed to copy')
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-accent"
      aria-label="Copy to clipboard"
    >
      <Copy className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
    </button>
  )
}

// link case sheet

function LinkCaseSheet({
  contactId,
  linkedCaseIds,
  open,
  onClose,
}: {
  contactId: string
  linkedCaseIds: Set<string>
  open: boolean
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const { data: cases = [] } = useCases()
  const linkContact = useLinkContactToCase()

  const available = cases.filter(
    (c) =>
      !linkedCaseIds.has(c.id) &&
      (search === '' ||
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.case_number.toLowerCase().includes(search.toLowerCase())),
  )

  const handleLink = async (caseId: string) => {
    await linkContact.mutateAsync({ contactId, caseId })
    onClose()
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="h-[70vh] overflow-y-auto pb-safe rounded-t-xl">
        <SheetHeader className="pb-4">
          <SheetTitle>Link to case</SheetTitle>
        </SheetHeader>
        <div className="space-y-3">
          <Input
            placeholder="Search cases..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {available.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {cases.length === 0 ? 'No cases found.' : 'All cases are already linked.'}
            </p>
          ) : (
            <div className="space-y-2">
              {available.map((c) => (
                <CaseCard
                  key={c.id}
                  case={c}
                  onClick={() => handleLink(c.id)}
                />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// main component

export function ContactDetailClient({ id, initialData }: ContactDetailClientProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [linkCaseOpen, setLinkCaseOpen] = useState(false)

  const editFormRef = useRef<ContactFormHandle>(null)

  const { data: contact, isLoading, error, refetch } = useContactDetail(id)
  const { data: linkedCases = [], isLoading: casesLoading } = useCasesByContact(id)
  const softDelete = useSoftDeleteContact()

  const c = contact ?? initialData
  const linkedCaseIds = new Set(linkedCases.map((lc) => lc.id))

  const handleDelete = async () => {
    await softDelete.mutateAsync(id)
    setDeleteOpen(false)
    router.push(ROUTES.contacts.list)
  }

  if (isLoading && !c) return <PageSkeleton />
  if (error && !c) return <ErrorState error={error} onRetry={() => refetch()} />
  if (!c) return <ErrorState title="Contact not found" subtitle="This contact could not be loaded." />

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <PageHeader
        title={c.full_name}
        backHref={ROUTES.contacts.list}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
            className="gap-1.5"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Edit
          </Button>
        }
      />

      <div className="flex-1 px-4 md:px-6 pb-6 pt-4 space-y-4">
                <div className="rounded-lg border bg-card p-5 flex items-center gap-4">
          <ContactAvatar name={c.full_name} size="lg" />
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-foreground">{c.full_name}</h2>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <RoleBadge role={c.role} />
            </div>
            {c.organization && (
              <div className="flex items-center gap-1.5 mt-1.5 text-sm text-muted-foreground">
                <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{c.organization}</span>
              </div>
            )}
          </div>
        </div>

                {(c.email || c.phone) && (
          <div className="rounded-lg border bg-card p-5 space-y-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Contact info
            </h2>
            {c.email && (
              <div className="group flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                <a
                  href={`mailto:${c.email}`}
                  className="text-sm text-foreground hover:underline truncate"
                >
                  {c.email}
                </a>
                <CopyButton value={c.email} />
              </div>
            )}
            {c.phone && (
              <div className="group flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                <a
                  href={`tel:${c.phone}`}
                  className="text-sm text-foreground hover:underline"
                >
                  {c.phone}
                </a>
                <CopyButton value={c.phone} />
              </div>
            )}
          </div>
        )}

                {c.notes && (
          <div className="rounded-lg border bg-card p-5">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Notes
            </h2>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {c.notes}
            </p>
          </div>
        )}

                <div className="rounded-lg border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Cases
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 h-7 text-xs"
              onClick={() => setLinkCaseOpen(true)}
            >
              <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
              Link to case
            </Button>
          </div>

          {casesLoading ? (
            <ListSkeleton count={2} />
          ) : linkedCases.length === 0 ? (
            <div className="py-4 text-center space-y-2">
              <p className="text-sm text-muted-foreground">Not linked to any cases yet.</p>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setLinkCaseOpen(true)}
              >
                Link to case
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {linkedCases.map((lc) => (
                <CaseCard
                  key={lc.id}
                  case={lc}
                  onClick={() => router.push(ROUTES.cases.detail(lc.id))}
                />
              ))}
            </div>
          )}
        </div>

                <div className="rounded-lg border border-destructive/30 bg-card p-5">
          <h2 className="text-xs font-semibold text-destructive uppercase tracking-wide mb-3">
            Danger zone
          </h2>
          <div className={cn('flex items-center justify-between gap-4')}>
            <p className="text-sm text-muted-foreground">
              Deleting this contact removes them from all cases. The record can be recovered.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-1.5" aria-hidden="true" />
              Delete contact
            </Button>
          </div>
        </div>
      </div>

      <FormPanel
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit contact"
        subtitle="Update this contact's details"
        size="md"
        isLoading={editLoading}
        footer={
          <FormPanelFooter
            onCancel={() => setEditOpen(false)}
            submitLabel="Save changes"
            isLoading={editLoading}
            onSubmit={() => editFormRef.current?.submit()}
          />
        }
      >
        <ContactForm
          ref={editFormRef}
          mode="edit"
          initialData={c}
          hideSubmitButton
          onLoadingChange={setEditLoading}
          onSuccess={() => setEditOpen(false)}
        />
      </FormPanel>

            <LinkCaseSheet
        contactId={id}
        linkedCaseIds={linkedCaseIds}
        open={linkCaseOpen}
        onClose={() => setLinkCaseOpen(false)}
      />

            <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        itemType="contact"
        itemName={c.full_name}
        isLoading={softDelete.isPending}
      />
    </div>
  )
}

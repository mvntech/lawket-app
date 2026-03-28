'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Pencil, Trash2, Calendar, Clock, Plus, FileText, Users, Search, X } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/status-badge'
import { PageHeader } from '@/components/shared/page-header'
import { ErrorState } from '@/components/shared/error-state'
import { PageSkeleton, ListSkeleton } from '@/components/shared/loading-skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog'
import { FormPanel } from '@/components/shared/form-panel'
import { FormPanelFooter } from '@/components/shared/form-panel-footer'
import { HearingCard } from '@/components/calendar/hearing-card'
import { DeadlineCard } from '@/components/calendar/deadline-card'
import { HearingForm } from '@/components/calendar/hearing-form'
import { HearingPrepSheet } from '@/components/calendar/hearing-prep-sheet'
import { DeadlineForm } from '@/components/calendar/deadline-form'
import type { HearingFormHandle } from '@/components/calendar/hearing-form'
import type { DeadlineFormHandle } from '@/components/calendar/deadline-form'
import { useCaseDetail, useSoftDeleteCase, useUpdateCase } from '@/hooks/use-cases'
import { AIButton } from '@/components/ai/ai-button'
import { AIResponseCard } from '@/components/ai/ai-response-card'
import { AIPanelTrigger } from '@/components/ai/ai-panel-trigger'
import { CaseAIPanel } from '@/components/ai/case-ai-panel'
import { useCaseSummaryAI, useCleanNotesAI, useDraftSectionAI } from '@/hooks/use-ai'
import { useCredits } from '@/hooks/use-credits'
import { useHearingsByCase, useSoftDeleteHearing } from '@/hooks/use-hearings'
import {
  useDeadlinesByCase,
  useMarkDeadlineComplete,
  useSoftDeleteDeadline,
} from '@/hooks/use-deadlines'
import { useDocumentsByCase, useSoftDeleteDocument } from '@/hooks/use-documents'
import {
  useContacts,
  useContactsByCase,
  useLinkContactToCase,
  useUnlinkContactFromCase,
} from '@/hooks/use-contacts'
import { deadlinesService } from '@/services/deadlines.service'
import { documentsService } from '@/services/documents.service'
import { ROUTES } from '@/lib/constants/routes'
import type { CaseModel } from '@/services/cases.service'
import type { HearingModel } from '@/services/hearings.service'
import type { DeadlineModel } from '@/services/deadlines.service'
import type { DocumentModel } from '@/services/documents.service'
import type { ContactModel } from '@/types/common.types'
import { DocumentUpload } from '@/components/documents/document-upload'
import { DocumentTile } from '@/components/documents/document-tile'
import { DocumentViewer } from '@/components/documents/document-viewer'
import { ContactCard } from '@/components/contacts/contact-card'
import { ContactForm } from '@/components/contacts/contact-form'
import type { ContactFormHandle } from '@/components/contacts/contact-form'
import { formatFileSize } from '@/lib/utils/format'
import { analytics } from '@/lib/analytics'
import { useAuth } from '@/hooks/use-auth'

// types

interface CaseDetailClientProps {
  id: string
  initialData: CaseModel
}

// info row

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  )
}

// overview tab

function OverviewTab({
  c,
  onDeleteConfirm,
  onShowSummaryAI,
  onShowCleanNotesAI,
  onShowDraftAI,
  creditBalance,
}: {
  c: CaseModel
  onDeleteConfirm: () => void
  onShowSummaryAI: () => void
  onShowCleanNotesAI: () => void
  onShowDraftAI: () => void
  creditBalance: number
}) {
  const router = useRouter()

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground tracking-wide uppercase mb-1">
              {c.case_number}
            </p>
            <h1 className="text-xl font-bold text-foreground wrap-break-word">{c.title}</h1>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <StatusBadge status={c.status} size="md" />
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground capitalize">
                {c.case_type}
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(ROUTES.cases.edit(c.id))}
            aria-label="Edit case"
            className="shrink-0"
          >
            <Pencil className="h-4 w-4 mr-1.5" aria-hidden="true" />
            Edit
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Details
        </h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <InfoRow label="Client" value={c.client_name} />
          <InfoRow label="Client contact" value={c.client_contact} />
          <InfoRow label="Opposing party" value={c.opposing_party} />
          <InfoRow label="Court" value={c.court_name} />
          <InfoRow label="Judge" value={c.judge_name} />
          <InfoRow
            label="Filed date"
            value={c.filed_date ? format(new Date(c.filed_date), 'PPP') : null}
          />
          <InfoRow
            label="Last updated"
            value={format(new Date(c.updated_at), 'PPP p')}
          />
        </dl>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Lawket AI Assistant
        </h2>
        <div className="flex flex-wrap gap-2">
          <AIButton label="Generate summary" onClick={onShowSummaryAI} size="sm" disabled={creditBalance === 0} />
          <AIButton label="Draft section" onClick={onShowDraftAI} size="sm" disabled={creditBalance === 0} />
          <AIButton
            label="Clean notes"
            onClick={onShowCleanNotesAI}
            size="sm"
            disabled={!c.notes || creditBalance === 0}
          />
        </div>
      </div>

      {c.description && (
        <div className="rounded-lg border bg-card p-5">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Description
          </h2>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {c.description}
          </p>
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

      <div className="rounded-lg border border-destructive/30 bg-card p-5">
        <h2 className="text-xs font-semibold text-destructive uppercase tracking-wide mb-3">
          Danger zone
        </h2>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Deleting this case will remove it from your active list. It can be recovered
            from your case history.
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
            onClick={onDeleteConfirm}
          >
            <Trash2 className="h-4 w-4 mr-1.5" aria-hidden="true" />
            Delete case
          </Button>
        </div>
      </div>
    </div>
  )
}

// hearings tab

function HearingsTab({ caseId, caseModel }: { caseId: string; caseModel: CaseModel }) {
  const [formOpen, setFormOpen] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [editingHearing, setEditingHearing] = useState<HearingModel | null>(null)
  const [prepHearing, setPrepHearing] = useState<HearingModel | null>(null)

  const formRef = useRef<HearingFormHandle>(null)

  const { data: hearings = [], isLoading, error, refetch } = useHearingsByCase(caseId)
  const softDelete = useSoftDeleteHearing()

  if (isLoading) return <ListSkeleton count={3} />
  if (error) return <ErrorState onRetry={() => refetch()} />

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {hearings.length > 0
            ? `${hearings.length} hearing${hearings.length !== 1 ? 's' : ''}`
            : ''}
        </p>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => {
            setEditingHearing(null)
            setFormOpen(true)
          }}
        >
          <Plus className="h-4 w-4" />
          Add hearing
        </Button>
      </div>

      {hearings.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No hearings scheduled"
          subtitle="Add a hearing for this case."
          ctaLabel="Add hearing"
          onCta={() => {
            setEditingHearing(null)
            setFormOpen(true)
          }}
        />
      ) : (
        <div className="space-y-2">
          {hearings.map((h) => (
            <HearingCard
              key={h.id}
              hearing={h}
              showCase={false}
              onEdit={() => {
                setEditingHearing(h)
                setFormOpen(true)
              }}
              onDelete={() => softDelete.mutate(h.id)}
              onPrepare={() => setPrepHearing(h)}
            />
          ))}
        </div>
      )}

      <FormPanel
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditingHearing(null)
        }}
        title={editingHearing ? 'Edit hearing' : 'Add hearing'}
        subtitle={editingHearing ? 'Edit the hearing details' : 'Add a new hearing to your calendar'}
        size="md"
        isLoading={formLoading}
        footer={
          <FormPanelFooter
            onCancel={() => {
              setFormOpen(false)
              setEditingHearing(null)
            }}
            submitLabel={editingHearing ? 'Save changes' : 'Add hearing'}
            isLoading={formLoading}
            onSubmit={() => formRef.current?.submit()}
          />
        }
      >
        <HearingForm
          ref={formRef}
          mode={editingHearing ? 'edit' : 'create'}
          caseId={caseId}
          cases={[caseModel]}
          initialData={editingHearing ?? undefined}
          hideSubmitButton
          onLoadingChange={setFormLoading}
          onSuccess={() => {
            setFormOpen(false)
            setEditingHearing(null)
          }}
          onCancel={() => {
            setFormOpen(false)
            setEditingHearing(null)
          }}
        />
      </FormPanel>

      <HearingPrepSheet
        hearing={prepHearing}
        caseData={caseModel}
        isOpen={!!prepHearing}
        onClose={() => setPrepHearing(null)}
      />
    </div>
  )
}

// deadlines tab

function DeadlinesTab({ caseId, caseModel }: { caseId: string; caseModel: CaseModel }) {
  const [formOpen, setFormOpen] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [editingDeadline, setEditingDeadline] = useState<DeadlineModel | null>(null)

  const formRef = useRef<DeadlineFormHandle>(null)

  const { data: rawDeadlines = [], isLoading, error, refetch } = useDeadlinesByCase(caseId)
  const markComplete = useMarkDeadlineComplete()
  const softDelete = useSoftDeleteDeadline()

  const deadlines = deadlinesService.getPrioritySorted(rawDeadlines)

  if (isLoading) return <ListSkeleton count={3} />
  if (error) return <ErrorState onRetry={() => refetch()} />

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {deadlines.length > 0
            ? `${deadlines.length} deadline${deadlines.length !== 1 ? 's' : ''}`
            : ''}
        </p>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => {
            setEditingDeadline(null)
            setFormOpen(true)
          }}
        >
          <Plus className="h-4 w-4" />
          Add deadline
        </Button>
      </div>

      {deadlines.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No deadlines set"
          subtitle="Add a deadline for this case."
          ctaLabel="Add deadline"
          onCta={() => {
            setEditingDeadline(null)
            setFormOpen(true)
          }}
        />
      ) : (
        <div className="space-y-2">
          {deadlines.map((d) => (
            <DeadlineCard
              key={d.id}
              deadline={d}
              showCase={false}
              onEdit={() => {
                setEditingDeadline(d)
                setFormOpen(true)
              }}
              onDelete={() => softDelete.mutate(d.id)}
              onComplete={() => markComplete.mutate(d.id)}
            />
          ))}
        </div>
      )}

      <FormPanel
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditingDeadline(null)
        }}
        title={editingDeadline ? 'Edit deadline' : 'Add deadline'}
        subtitle={editingDeadline ? 'Edit the deadline details' : 'Add a new deadline for this case'}
        size="md"
        isLoading={formLoading}
        footer={
          <FormPanelFooter
            onCancel={() => {
              setFormOpen(false)
              setEditingDeadline(null)
            }}
            submitLabel={editingDeadline ? 'Save changes' : 'Add deadline'}
            isLoading={formLoading}
            onSubmit={() => formRef.current?.submit()}
          />
        }
      >
        <DeadlineForm
          ref={formRef}
          mode={editingDeadline ? 'edit' : 'create'}
          caseId={caseId}
          cases={[caseModel]}
          initialData={editingDeadline ?? undefined}
          hideSubmitButton
          onLoadingChange={setFormLoading}
          onSuccess={() => {
            setFormOpen(false)
            setEditingDeadline(null)
          }}
          onCancel={() => {
            setFormOpen(false)
            setEditingDeadline(null)
          }}
        />
      </FormPanel>
    </div>
  )
}

// contacts tab

function ContactsTab({ caseId }: { caseId: string }) {
  const [linkOpen, setLinkOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [unlinkingContact, setUnlinkingContact] = useState<ContactModel | null>(null)

  const addFormRef = useRef<ContactFormHandle>(null)

  const { data: linkedContacts = [], isLoading, error, refetch } = useContactsByCase(caseId)
  const { data: allContacts = [] } = useContacts()
  const linkContact = useLinkContactToCase()
  const unlinkContact = useUnlinkContactFromCase()

  const linkedIds = new Set(linkedContacts.map((c) => c.id))

  const availableToLink = allContacts.filter(
    (c) =>
      !linkedIds.has(c.id) &&
      (search === '' || c.full_name.toLowerCase().includes(search.toLowerCase())),
  )

  const handleLinkExisting = async (contactId: string) => {
    await linkContact.mutateAsync({ contactId, caseId })
    setLinkOpen(false)
  }

  const handleUnlink = async () => {
    if (!unlinkingContact) return
    await unlinkContact.mutateAsync({ contactId: unlinkingContact.id, caseId })
    setUnlinkingContact(null)
  }

  if (isLoading) return <ListSkeleton count={3} />
  if (error) return <ErrorState onRetry={() => refetch()} />

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-muted-foreground">
          {linkedContacts.length > 0
            ? `${linkedContacts.length} contact${linkedContacts.length !== 1 ? 's' : ''}`
            : ''}
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setLinkOpen(true)}>
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            Link existing
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add new
          </Button>
        </div>
      </div>

      {linkedContacts.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No contacts linked"
          subtitle="Link clients, opposing counsel, and other contacts to this case."
          ctaLabel="Link contact"
          onCta={() => setLinkOpen(true)}
        />
      ) : (
        <div role="list" className="space-y-1">
          {linkedContacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              compact
              onDelete={() => setUnlinkingContact(contact)}
            />
          ))}
        </div>
      )}

      <FormPanel
        isOpen={linkOpen}
        onClose={() => setLinkOpen(false)}
        title="Link existing contact"
        subtitle="Select a contact to link to this case."
        size="md"
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-9 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {availableToLink.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {allContacts.length === 0
                ? 'No contacts found. Add contacts first.'
                : 'All contacts are already linked.'}
            </p>
          ) : (
            <div role="list" className="space-y-2">
              {availableToLink.map((contact) => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  onClick={() => handleLinkExisting(contact.id)}
                />
              ))}
            </div>
          )}
        </div>
      </FormPanel>

      <FormPanel
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add new contact"
        subtitle="Create a contact and link it to this case."
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
          defaultRole="client"
          hideSubmitButton
          onLoadingChange={setAddLoading}
          onSuccess={async (contact) => {
            await linkContact.mutateAsync({ contactId: contact.id, caseId })
            setAddOpen(false)
          }}
          onCancel={() => setAddOpen(false)}
        />
      </FormPanel>

      <DeleteConfirmDialog
        open={!!unlinkingContact}
        onOpenChange={(open) => !open && setUnlinkingContact(null)}
        onConfirm={handleUnlink}
        itemType="contact"
        itemName={unlinkingContact ? `Remove ${unlinkingContact.full_name} from this case?` : ''}
        isLoading={unlinkContact.isPending}
      />
    </div>
  )
}

// documents tab

function DocumentsTab({ caseId }: { caseId: string }) {
  const { user } = useAuth()
  const [viewingDoc, setViewingDoc] = useState<DocumentModel | null>(null)
  const [deletingDoc, setDeletingDoc] = useState<DocumentModel | null>(null)

  const { data: documents = [], isLoading, error, refetch } = useDocumentsByCase(caseId)
  const softDelete = useSoftDeleteDocument()

  const totalFiles = documents.length
  const totalBytes = documents.reduce((sum, d) => sum + (d.file_size ?? 0), 0)

  const handleDownload = async (doc: DocumentModel) => {
    try {
      const url = await documentsService.getSignedUrl(doc.file_path)
      window.open(url, '_blank', 'noopener,noreferrer')
      analytics.documentDownloaded()
    } catch {
      // signed URL errors handled by viewer
    }
  }

  const handleDelete = async () => {
    if (!deletingDoc) return
    try {
      await softDelete.mutateAsync({ id: deletingDoc.id, filePath: deletingDoc.file_path })
    } catch {
      return
    }
    setDeletingDoc(null)
  }

  if (isLoading) return <ListSkeleton count={3} />
  if (error) return <ErrorState onRetry={() => refetch()} />

  return (
    <div className="space-y-4">
      <DocumentUpload
        caseId={caseId}
        userId={user?.id ?? ''}
        compact
      />

      {totalFiles > 0 && (
        <p className="text-xs text-muted-foreground">
          {totalFiles} file{totalFiles !== 1 ? 's' : ''} · {formatFileSize(totalBytes)}
        </p>
      )}

      {documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents attached"
          subtitle="Upload documents for this case"
        />
      ) : (
        <div role="list" className="space-y-2">
          {documents.map((doc) => (
            <DocumentTile
              key={doc.id}
              document={doc}
              onView={() => {
                setViewingDoc(doc)
                analytics.documentViewed(doc.mime_type ?? '')
              }}
              onDownload={() => handleDownload(doc)}
              onDelete={() => setDeletingDoc(doc)}
            />
          ))}
        </div>
      )}

      <DocumentViewer
        document={viewingDoc}
        isOpen={!!viewingDoc}
        onClose={() => setViewingDoc(null)}
      />

      <DeleteConfirmDialog
        open={!!deletingDoc}
        onOpenChange={(open) => !open && setDeletingDoc(null)}
        onConfirm={handleDelete}
        itemType="document"
        itemName={deletingDoc?.name ?? ''}
        isLoading={softDelete.isPending}
      />
    </div>
  )
}

// main component

export function CaseDetailClient({ id, initialData }: CaseDetailClientProps) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [showSummaryAI, setShowSummaryAI] = useState(false)
  const [showCleanNotesAI, setShowCleanNotesAI] = useState(false)
  const [showDraftAI, setShowDraftAI] = useState(false)
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false)

  const { data: caseData, isLoading, error, refetch } = useCaseDetail(id)
  const softDelete = useSoftDeleteCase()
  const updateCase = useUpdateCase()

  const { data: hearings } = useHearingsByCase(id)
  const { data: documents } = useDocumentsByCase(id)
  const { data: creditsData } = useCredits()
  const creditBalance = creditsData?.balance ?? 0

  const caseSummaryAI = useCaseSummaryAI()
  const cleanNotesAI = useCleanNotesAI()
  const draftSectionAI = useDraftSectionAI()

  const c = caseData ?? initialData

  const handleDelete = async () => {
    try {
      await softDelete.mutateAsync(id)
    } catch {
      // onError in the hook already shows a toast and rolls back the optimistic update
      return
    }
    setDeleteOpen(false)
    router.refresh()
    router.push(ROUTES.cases.list)
  }

  // auto-request AI when sheets open
  useEffect(() => {
    if (showSummaryAI && c) {
      caseSummaryAI.reset()
      void caseSummaryAI.request({
        caseNumber: c.case_number,
        title: c.title,
        clientName: c.client_name,
        caseType: c.case_type,
        status: c.status,
        courtName: c.court_name,
        judgeName: c.judge_name,
        opposingParty: c.opposing_party,
        description: c.description,
        notes: c.notes,
      })
    }
  }, [showSummaryAI])

  useEffect(() => {
    if (showCleanNotesAI && c?.notes) {
      cleanNotesAI.reset()
      void cleanNotesAI.request({ rawNotes: c.notes, caseTitle: c.title })
    }
  }, [showCleanNotesAI])

  useEffect(() => {
    if (showDraftAI && c) {
      draftSectionAI.reset()
      void draftSectionAI.request({
        sectionType: 'petition_intro',
        caseContext: `Case: ${c.title}\nType: ${c.case_type}\nClient: ${c.client_name}\n${c.description ?? ''}`,
      })
    }
  }, [showDraftAI])

  if (isLoading && !c) return <PageSkeleton />
  if (error && !c) return <ErrorState error={error} onRetry={() => refetch()} />
  if (!c) return <ErrorState title="Case not found" subtitle="This case could not be loaded." />

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <PageHeader title={c.title} backHref={ROUTES.cases.list} />

      <div className="flex-1 px-4 md:px-6 pb-6 pt-4">
        <Tabs defaultValue="overview">
          <TabsList className="mb-4 w-full sm:w-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="hearings">Hearings</TabsTrigger>
            <TabsTrigger value="deadlines">Deadlines</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab
              c={c}
              onDeleteConfirm={() => setDeleteOpen(true)}
              onShowSummaryAI={() => setShowSummaryAI(true)}
              onShowCleanNotesAI={() => setShowCleanNotesAI(true)}
              onShowDraftAI={() => setShowDraftAI(true)}
              creditBalance={creditBalance}
            />
          </TabsContent>

          <TabsContent value="hearings">
            <HearingsTab caseId={id} caseModel={c} />
          </TabsContent>

          <TabsContent value="deadlines">
            <DeadlinesTab caseId={id} caseModel={c} />
          </TabsContent>

          <TabsContent value="documents">
            <DocumentsTab caseId={id} />
          </TabsContent>

          <TabsContent value="contacts">
            <ContactsTab caseId={id} />
          </TabsContent>
        </Tabs>
      </div>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        itemType="case"
        itemName={c.title}
        isLoading={softDelete.isPending}
      />

      <FormPanel
        isOpen={showSummaryAI}
        onClose={() => setShowSummaryAI(false)}
        title="AI case summary"
        subtitle={c.title}
        size="lg"
        isLoading={caseSummaryAI.isLoading || caseSummaryAI.isStreaming}
      >
        <AIResponseCard
          isStreaming={caseSummaryAI.isStreaming}
          content={caseSummaryAI.content}
          isLoading={caseSummaryAI.isLoading}
          title="AI case summary"
          onSave={(text) => {
            updateCase.mutate({
              id,
              data: {
                description: (c.description ?? '') + '\n\n---\nAI Summary:\n' + text,
              },
            })
            setShowSummaryAI(false)
          }}
          onDiscard={() => setShowSummaryAI(false)}
        />
        {caseSummaryAI.error && (
          <p className="mt-3 text-sm text-destructive">{caseSummaryAI.error}</p>
        )}
      </FormPanel>

      <FormPanel
        isOpen={showCleanNotesAI}
        onClose={() => setShowCleanNotesAI(false)}
        title="AI notes cleanup"
        subtitle={c.title}
        size="lg"
        isLoading={cleanNotesAI.isLoading || cleanNotesAI.isStreaming}
      >
        {c.notes && (
          <div className="mb-4 rounded-lg border bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Original notes
            </p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{c.notes}</p>
          </div>
        )}
        <AIResponseCard
          isStreaming={cleanNotesAI.isStreaming}
          content={cleanNotesAI.content}
          isLoading={cleanNotesAI.isLoading}
          title="Cleaned notes"
          onSave={(text) => {
            updateCase.mutate({ id, data: { notes: text } })
            setShowCleanNotesAI(false)
          }}
          onDiscard={() => setShowCleanNotesAI(false)}
        />
        {cleanNotesAI.error && (
          <p className="mt-3 text-sm text-destructive">{cleanNotesAI.error}</p>
        )}
      </FormPanel>

      <FormPanel
        isOpen={showDraftAI}
        onClose={() => setShowDraftAI(false)}
        title="AI draft section"
        subtitle={c.title}
        size="lg"
        isLoading={draftSectionAI.isLoading || draftSectionAI.isStreaming}
      >
        <AIResponseCard
          isStreaming={draftSectionAI.isStreaming}
          content={draftSectionAI.content}
          isLoading={draftSectionAI.isLoading}
          title="Draft: Petition introduction"
          onSave={(text) => {
            updateCase.mutate({
              id,
              data: {
                description: (c.description ?? '') + '\n\n---\nDraft Section:\n' + text,
              },
            })
            setShowDraftAI(false)
          }}
          onDiscard={() => setShowDraftAI(false)}
        />
        {draftSectionAI.error && (
          <p className="mt-3 text-sm text-destructive">{draftSectionAI.error}</p>
        )}
      </FormPanel>

      <AIPanelTrigger
        onClick={() => setIsAIPanelOpen(true)}
        isOpen={isAIPanelOpen}
      />
      <CaseAIPanel
        isOpen={isAIPanelOpen}
        onClose={() => setIsAIPanelOpen(false)}
        caseId={id}
        caseTitle={c.title}
        hasHearings={(hearings?.length ?? 0) > 0}
        hasDocuments={(documents?.length ?? 0) > 0}
      />
    </div>
  )
}

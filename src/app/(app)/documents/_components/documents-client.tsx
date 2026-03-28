'use client'

import { useEffect, useMemo, useState } from 'react'
import { FileText, Plus, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormPanel } from '@/components/shared/form-panel'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { ListSkeleton } from '@/components/shared/loading-skeleton'
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog'
import { DocumentTile } from '@/components/documents/document-tile'
import { DocumentUploadPanel } from '@/components/documents/document-upload-panel'
import { DocumentViewer } from '@/components/documents/document-viewer'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAllDocuments, useSoftDeleteDocument, useUpdateDocumentType } from '@/hooks/use-documents'
import { useIsMobile } from '@/hooks/use-online'
import { useCases } from '@/hooks/use-cases'
import { documentsService } from '@/services/documents.service'
import { analytics } from '@/lib/analytics'
import type { DocumentModel } from '@/services/documents.service'
import type { DocumentType } from '@/types/database.types'
import { formatFileSize } from '@/lib/utils/format'

// constants

const DOC_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: 'petition', label: 'Petition' },
  { value: 'affidavit', label: 'Affidavit' },
  { value: 'evidence', label: 'Evidence' },
  { value: 'order', label: 'Order' },
  { value: 'judgment', label: 'Judgment' },
  { value: 'correspondence', label: 'Correspondence' },
  { value: 'contract', label: 'Contract' },
  { value: 'other', label: 'Other' },
]

// types

type MimeFilter = 'all' | 'pdf' | 'images'
type CategoryFilter = 'all' | DocumentType

interface DocumentsClientProps {
  initialDocuments: DocumentModel[]
  userId: string
}

// components

export function DocumentsClient({ initialDocuments, userId }: DocumentsClientProps) {
  const isMobile = useIsMobile()

  const [search, setSearch] = useState('')
  const [mimeFilter, setMimeFilter] = useState<MimeFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [viewingDoc, setViewingDoc] = useState<DocumentModel | null>(null)
  const [deletingDoc, setDeletingDoc] = useState<DocumentModel | null>(null)

  // seed dexie with server-fetched data on first mount
  useEffect(() => {
    if (initialDocuments.length > 0) {
      documentsService.seedFromServer(initialDocuments).catch(() => undefined)
    }
  }, [initialDocuments])

  const { data: documents = initialDocuments, isLoading, error, refetch } = useAllDocuments(userId)
  const { data: allCases = [] } = useCases()
  const softDelete = useSoftDeleteDocument()
  const updateDocType = useUpdateDocumentType()

  // case title lookup
  const caseMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of allCases) map.set(c.id, c.title)
    return map
  }, [allCases])

  // storage usage
  const totalFiles = documents.length
  const totalBytes = documents.reduce((sum, d) => sum + (d.file_size ?? 0), 0)
  const storageLabel = `${totalFiles} document${totalFiles !== 1 ? 's' : ''} · ${formatFileSize(totalBytes)}`

  // filter documents
  const filtered = useMemo(() => {
    let list = documents

    if (search.trim()) {
      const q = search.toLowerCase().trim()
      list = list.filter((d) => d.name.toLowerCase().includes(q))
    }

    if (mimeFilter === 'pdf') {
      list = list.filter((d) => d.mime_type === 'application/pdf')
    } else if (mimeFilter === 'images') {
      list = list.filter((d) => d.mime_type?.startsWith('image/') ?? false)
    }

    if (categoryFilter !== 'all') {
      list = list.filter((d) => d.doc_type === categoryFilter)
    }

    return list
  }, [documents, search, mimeFilter, categoryFilter])

  // group by case_id
  const grouped = useMemo(() => {
    const groups = new Map<string, DocumentModel[]>()
    for (const doc of filtered) {
      const arr = groups.get(doc.case_id) ?? []
      arr.push(doc)
      groups.set(doc.case_id, arr)
    }
    return groups
  }, [filtered])

  const handleView = (doc: DocumentModel) => {
    setViewingDoc(doc)
    analytics.documentViewed(doc.mime_type ?? '')
  }

  const handleDownload = async (doc: DocumentModel) => {
    try {
      const url = await documentsService.getSignedUrl(doc.file_path)
      window.open(url, '_blank', 'noopener,noreferrer')
      analytics.documentDownloaded()
    } catch {
      // signed URL failure (viewer handles its own error state)
    }
  }

  const handleDelete = async () => {
    if (!deletingDoc) return
    await softDelete.mutateAsync({ id: deletingDoc.id, filePath: deletingDoc.file_path })
    setDeletingDoc(null)
  }

  const handleUpdateDocType = (doc: DocumentModel, docType: DocumentType) => {
    updateDocType.mutate({ id: doc.id, docType, caseId: doc.case_id })
  }

  if (isLoading && documents.length === 0) {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        <PageHeader title="Documents" subtitle={storageLabel} />
        <div className="px-4 md:px-6 py-4">
          <ListSkeleton count={5} />
        </div>
      </div>
    )
  }

  if (error && documents.length === 0) {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        <PageHeader title="Documents" />
        <ErrorState onRetry={() => refetch()} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <PageHeader
        title="Documents"
        subtitle="Manage all your case-related documents"
        action={
          !isMobile ? (
            <Button onClick={() => setUploadOpen(true)} className="gap-1.5" size="sm">
              Upload document
            </Button>
          ) : undefined
        }
      />

      <div className="flex-1 px-4 md:px-6 py-4 space-y-4">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <Input
            placeholder="Search documents…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9"
            aria-label="Search documents"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={mimeFilter} onValueChange={(v) => setMimeFilter(v as MimeFilter)}>
            <SelectTrigger className="h-8 text-xs w-auto min-w-[120px]" aria-label="Filter by file type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All file types</SelectItem>
              <SelectItem value="pdf" className="text-xs">PDF</SelectItem>
              <SelectItem value="images" className="text-xs">Images</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={categoryFilter}
            onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}
          >
            <SelectTrigger className="h-8 text-xs w-auto min-w-[130px]" aria-label="Filter by category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All categories</SelectItem>
              {DOC_TYPE_OPTIONS.map(({ value, label }) => (
                <SelectItem key={value} value={value} className="text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-xs text-muted-foreground ml-auto shrink-0">
            {storageLabel}
          </span>
        </div>

        {filtered.length === 0 ? (
          documents.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents yet"
              subtitle="Upload case documents to keep everything in one place"
              ctaLabel="Upload document"
              onCta={() => setUploadOpen(true)}
            />
          ) : (
            <EmptyState
              icon={FileText}
              title="No results"
              subtitle="No documents match your search or filter"
            />
          )
        ) : (
          <div role="list" className="space-y-6">
            {Array.from(grouped.entries()).map(([caseId, docs]) => (
              <div key={caseId}>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  {caseMap.get(caseId) ?? 'N/A'}
                </h2>
                <div className="space-y-2">
                  {docs.map((doc) => (
                    <DocumentTile
                      key={doc.id}
                      document={doc}
                      onView={() => handleView(doc)}
                      onDownload={() => handleDownload(doc)}
                      onDelete={() => setDeletingDoc(doc)}
                      onUpdateDocType={(docType) => handleUpdateDocType(doc, docType)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isMobile && (
        <Button
          onClick={() => setUploadOpen(true)}
          className="fixed bottom-20 right-8 flex items-center justify-center h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Upload Document"
        >
          <Plus className="h-6 w-6" aria-hidden="true" />
        </Button>
      )}

      <FormPanel
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload document"
        subtitle="Select a case and category, then drop a file to upload"
        size="sm"
      >
        <DocumentUploadPanel
          userId={userId}
          onSuccess={() => setTimeout(() => setUploadOpen(false), 1500)}
        />
      </FormPanel>

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

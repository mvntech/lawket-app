'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  ChevronUp,
  UploadCloud,
  AlertCircle,
  CheckCircle,
  Loader2,
  X,
  Download,
  Trash2,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useUploadDocument, useDocumentsByCase, useSoftDeleteDocument, useDocumentSignedUrl, useUpdateDocumentType } from '@/hooks/use-documents'
import { useAuth } from '@/hooks/use-auth'
import {
  isValidFileType,
  isValidFileSize,
  formatFileSize,
  getFileIcon,
} from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import type { DocumentType } from '@/types/database.types'
import type { DocumentModel } from '@/services/documents.service'

// types

type FileStatus = 'pending' | 'uploading' | 'done' | 'error'

interface QueueItem {
  id: string
  file: File
  name: string
  docType: DocumentType
  status: FileStatus
  progress: number
  errorMessage: string | null
}

export interface CaseDocumentsPanelHandle {
  flushUploads: (caseId: string, userId: string) => Promise<void>
  hasPendingFiles: () => boolean
}

interface CaseDocumentsPanelProps {
  mode: 'create' | 'edit'
  caseId?: string
}

// constants

const DROPZONE_ACCEPT = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/heic': ['.heic'],
}

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

const DOC_TYPE_LABEL: Record<DocumentType, string> = {
  petition: 'Petition',
  affidavit: 'Affidavit',
  evidence: 'Evidence',
  order: 'Order',
  judgment: 'Judgment',
  correspondence: 'Correspondence',
  contract: 'Contract',
  other: 'Other',
}

// helpers

function validateFile(file: File): string | null {
  if (!isValidFileType(file.type))
    return 'Type not supported. Allowed: PDF, JPEG, PNG, WebP, HEIC.'
  if (!isValidFileSize(file.size))
    return `Exceeds 50MB limit (${formatFileSize(file.size)}).`
  return null
}

// renders a single already-uploaded document with download + soft-delete actions.

interface ExistingDocRowProps {
  doc: DocumentModel
  caseId: string
  confirmingId: string | null
  deletingId: string | null
  onDeleteClick: (id: string) => void
  onConfirmDelete: (doc: DocumentModel) => void
  onCancelDelete: () => void
}

function ExistingDocRow({
  doc,
  caseId,
  confirmingId,
  deletingId,
  onDeleteClick,
  onConfirmDelete,
  onCancelDelete,
}: ExistingDocRowProps) {
  // controls whether the signed-URL query is enabled for this row
  const [shouldFetch, setShouldFetch] = useState(false)
  const [isOpening, setIsOpening] = useState(false)
  // track whether we've already handled this URL to avoid re-opening on re-render
  const handledUrl = useRef<string | null>(null)
  const [editingType, setEditingType] = useState(false)

  const { data: signedUrl, isFetching: isFetchingUrl } = useDocumentSignedUrl(
    shouldFetch ? doc.file_path : null,
  )
  const updateDocType = useUpdateDocumentType()

  useEffect(() => {
    if (signedUrl && shouldFetch && signedUrl !== handledUrl.current) {
      handledUrl.current = signedUrl
      window.open(signedUrl, '_blank', 'noopener,noreferrer')
      setShouldFetch(false)
      setIsOpening(false)
    }
  }, [signedUrl, shouldFetch])

  function handleDownload() {
    setIsOpening(true)
    setShouldFetch(true)
  }

  function handleTypeChange(newType: DocumentType) {
    updateDocType.mutate({ id: doc.id, docType: newType, caseId })
    setEditingType(false)
  }

  const FileIcon = getFileIcon(doc.mime_type ?? '')
  const isConfirming = confirmingId === doc.id
  const isDeleting = deletingId === doc.id

  if (isConfirming) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2.5 flex items-center gap-3">
        <Trash2 className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
        <p className="flex-1 text-sm text-foreground truncate">
          Remove <span className="font-medium">{doc.name}</span>?
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onCancelDelete}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="h-7 text-xs px-3"
            onClick={() => onConfirmDelete(doc)}
            disabled={isDeleting}
          >
            {isDeleting && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" aria-hidden="true" />}
            Remove
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-md border bg-muted/20 px-3 py-2.5 flex items-center gap-2 group">
      <FileIcon
        className="h-4 w-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />

      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="text-sm font-medium truncate leading-tight">{doc.name}</span>

        {editingType ? (
          <div className="flex items-center gap-2">
            <Select
              value={doc.doc_type}
              onValueChange={(v) => handleTypeChange(v as DocumentType)}
            >
              <SelectTrigger className="h-6 text-[10px] px-2 w-32 border-primary/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPE_OPTIONS.map(({ value, label }) => (
                  <SelectItem key={value} value={value} className="text-xs">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              type="button"
              onClick={() => setEditingType(false)}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditingType(true)}
            title="Click to change category"
            className="text-left text-[10px] text-muted-foreground hover:text-primary transition-colors w-fit"
          >
            {DOC_TYPE_LABEL[doc.doc_type] ?? 'Other'}
            {doc.file_size != null && ` · ${formatFileSize(doc.file_size)}`}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={handleDownload}
        disabled={isOpening || isFetchingUrl}
        aria-label={`Download ${doc.name}`}
        className="shrink-0 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
      >
        {isOpening || isFetchingUrl
          ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          : <Download className="h-4 w-4" aria-hidden="true" />}
      </button>

      <button
        type="button"
        onClick={() => onDeleteClick(doc.id)}
        aria-label={`Remove ${doc.name}`}
        className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}

// component

export const CaseDocumentsPanel = forwardRef<
  CaseDocumentsPanelHandle,
  CaseDocumentsPanelProps
>(function CaseDocumentsPanel({ mode, caseId }, ref) {
  const [open, setOpen] = useState(mode === 'edit')
  const [queue, setQueue] = useState<QueueItem[]>([])
  const { user } = useAuth()
  const upload = useUploadDocument()
  const softDelete = useSoftDeleteDocument()

  // existing documents (edit mode only)
  const { data: existingDocs = [], isLoading: isLoadingDocs } = useDocumentsByCase(
    mode === 'edit' ? (caseId ?? '') : '',
  )

  // two-step soft-delete state
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function handleDeleteClick(id: string) {
    setConfirmingId(id)
  }

  function handleCancelDelete() {
    setConfirmingId(null)
  }

  function handleConfirmDelete(doc: DocumentModel) {
    setDeletingId(doc.id)
    softDelete.mutate(
      { id: doc.id, filePath: doc.file_path, caseId },
      {
        onSettled: () => {
          setDeletingId(null)
          setConfirmingId(null)
        },
      },
    )
  }

  // upload one item

  const uploadOne = useCallback(
    async (item: QueueItem, cid: string, uid: string): Promise<void> => {
      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id
            ? { ...q, status: 'uploading', progress: 0, errorMessage: null }
            : q,
        ),
      )

      const timer = setInterval(() => {
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id && q.status === 'uploading' && q.progress < 85
              ? { ...q, progress: q.progress + 5 }
              : q,
          ),
        )
      }, 180)

      try {
        await upload.mutateAsync({
          file: item.file,
          caseId: cid,
          userId: uid,
          metadata: { name: item.name, doc_type: item.docType },
        })
        clearInterval(timer)
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: 'done', progress: 100 } : q,
          ),
        )
        // in edit mode, remove the done item after a short delay once it
        // appears in existingDocs (the invalidate/refetch in the hook handles that).
        if (mode === 'edit') {
          setTimeout(() => {
            setQueue((prev) => prev.filter((q) => q.id !== item.id))
          }, 2500)
        }
      } catch (err) {
        clearInterval(timer)
        const msg =
          err instanceof Error ? err.message : 'Upload failed. Please try again.'
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? { ...q, status: 'error', errorMessage: msg, progress: 0 }
              : q,
          ),
        )
      }
    },
    [upload, mode],
  )

  // drop handler

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newItems: QueueItem[] = acceptedFiles.map((file) => {
        const err = validateFile(file)
        return {
          id: crypto.randomUUID(),
          file,
          name: file.name,
          docType: 'other',
          status: err ? 'error' : 'pending',
          progress: 0,
          errorMessage: err,
        }
      })

      setQueue((prev) => [...prev, ...newItems])

      // edit mode: start uploading immediately
      if (mode === 'edit' && caseId && user?.id) {
        const uid = user.id
        void Promise.allSettled(
          newItems
            .filter((i) => i.status === 'pending')
            .map((i) => uploadOne(i, caseId, uid)),
        )
      }
    },
    [mode, caseId, user?.id, uploadOne],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: DROPZONE_ACCEPT,
    maxFiles: 20,
  })

  // imperative handle (used by case-form in create mode)

  useImperativeHandle(
    ref,
    () => ({
      hasPendingFiles: () => queue.some((q) => q.status === 'pending'),
      flushUploads: async (cid: string, uid: string) => {
        const pending = queue.filter((q) => q.status === 'pending')
        await Promise.allSettled(pending.map((item) => uploadOne(item, cid, uid)))
      },
    }),
    [queue, uploadOne],
  )

  // queue helpers

  const removeItem = (id: string) =>
    setQueue((prev) => prev.filter((q) => q.id !== id))

  const retryItem = (item: QueueItem) => {
    if (mode === 'edit' && caseId && user?.id) {
      void uploadOne(item, caseId, user.id)
    } else {
      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id
            ? { ...q, status: 'pending', errorMessage: null, progress: 0 }
            : q,
        ),
      )
    }
  }

  const pendingCount = queue.filter((q) => q.status === 'pending').length
  const activeQueueCount = queue.filter((q) => q.status !== 'done').length

  // badge: existing saved docs + any non-done queue items (pending/uploading/error)
  const badgeCount = mode === 'edit'
    ? existingDocs.length + activeQueueCount
    : queue.length

  // render

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-6 py-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide hover:bg-muted/40 transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          Documents
          {badgeCount > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-primary/15 text-primary text-[10px] font-semibold px-1.5">
              {badgeCount}
            </span>
          )}
        </span>
        {open
          ? <ChevronUp className="h-4 w-4" aria-hidden="true" />
          : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-4 border-t">
          {mode === 'edit' && (
            <div className="mt-4 space-y-2">
              {isLoadingDocs ? (
                <div className="space-y-2">
                  {[0, 1].map((i) => (
                    <div
                      key={i}
                      className="h-12 rounded-md bg-muted/40 animate-pulse"
                      aria-hidden="true"
                    />
                  ))}
                </div>
              ) : existingDocs.length > 0 ? (
                <>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Saved documents
                  </p>
                  <div className="space-y-1.5">
                    {existingDocs.map((doc) => (
                      <ExistingDocRow
                        key={doc.id}
                        doc={doc}
                        caseId={caseId ?? ''}
                        confirmingId={confirmingId}
                        deletingId={deletingId}
                        onDeleteClick={handleDeleteClick}
                        onConfirmDelete={handleConfirmDelete}
                        onCancelDelete={handleCancelDelete}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No documents attached to this case yet.
                </p>
              )}
            </div>
          )}

          {mode === 'edit' && (existingDocs.length > 0 || isLoadingDocs) && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-2 text-[10px] text-muted-foreground uppercase tracking-wide">
                  Upload new
                </span>
              </div>
            </div>
          )}

          <div
            {...getRootProps()}
            style={{
              transform: isDragActive ? 'scale(1.01)' : 'scale(1)',
              transition: 'transform 0.15s ease',
            }}
            className={cn(
              'flex flex-col items-center justify-center rounded-lg border-2 border-dashed',
              'cursor-pointer min-h-[120px] transition-colors select-none',
              mode === 'edit' ? '' : 'mt-4',
              isDragActive
                ? 'border-primary bg-amber-50 dark:bg-amber-950/20'
                : 'border-border hover:border-muted-foreground/50 hover:bg-muted/30',
            )}
          >
            <input {...getInputProps()} />
            <UploadCloud
              className={cn(
                'h-7 w-7 mb-2',
                isDragActive ? 'text-primary' : 'text-muted-foreground',
              )}
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-foreground">
              {isDragActive ? 'Drop files here' : 'Drop files or click to select'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, JPEG, PNG, WebP · up to 50MB each · max 20 files
            </p>
            {mode === 'create' && (
              <p className="text-xs text-muted-foreground/60 mt-1">
                Files upload when the case is created
              </p>
            )}
          </div>

          <AnimatePresence initial={false}>
            {queue.map((item) => {
              const FileIcon = getFileIcon(item.file.type)
              const isActive = item.status === 'uploading'
              const isDone = item.status === 'done'
              const isError = item.status === 'error'

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0, overflow: 'hidden' }}
                  transition={{ duration: 0.18 }}
                  className="rounded-md border bg-muted/20 p-3 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <FileIcon
                      className={cn(
                        'h-4 w-4 shrink-0',
                        isError ? 'text-destructive' :
                          isDone ? 'text-emerald-500' :
                            isActive ? 'text-primary animate-pulse' :
                              'text-muted-foreground',
                      )}
                      aria-hidden="true"
                    />

                    <input
                      value={item.name}
                      onChange={(e) =>
                        setQueue((prev) =>
                          prev.map((q) =>
                            q.id === item.id ? { ...q, name: e.target.value } : q,
                          ),
                        )
                      }
                      disabled={isActive || isDone}
                      className={cn(
                        'flex-1 min-w-0 bg-transparent text-sm outline-none truncate',
                        'focus:outline-none focus-visible:outline-none',
                        (isActive || isDone) && 'opacity-60',
                      )}
                      aria-label="Document name"
                    />

                    <Select
                      value={item.docType}
                      onValueChange={(v) =>
                        setQueue((prev) =>
                          prev.map((q) =>
                            q.id === item.id ? { ...q, docType: v as DocumentType } : q,
                          ),
                        )
                      }
                      disabled={isActive || isDone}
                    >
                      <SelectTrigger className="h-7 w-30 text-xs shrink-0 px-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DOC_TYPE_OPTIONS.map(({ value, label }) => (
                          <SelectItem key={value} value={value} className="text-xs">
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {isDone ? (
                      <CheckCircle
                        className="h-4 w-4 shrink-0 text-emerald-500"
                        aria-label="Uploaded"
                      />
                    ) : isActive ? (
                      <Loader2
                        className="h-4 w-4 shrink-0 text-primary animate-spin"
                        aria-label="Uploading"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                        aria-label={`Remove ${item.name}`}
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>

                  <div className="pl-6">
                    {isActive && (
                      <div className="space-y-1">
                        <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-primary"
                            initial={{ width: '0%' }}
                            animate={{ width: `${item.progress}%` }}
                            transition={{ ease: 'easeOut', duration: 0.3 }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Uploading… {item.progress}%
                        </p>
                      </div>
                    )}

                    {isError && (
                      <div className="flex items-center gap-2">
                        <AlertCircle
                          className="h-3.5 w-3.5 shrink-0 text-destructive"
                          aria-hidden="true"
                        />
                        <p className="flex-1 text-xs text-destructive truncate">
                          {item.errorMessage}
                        </p>
                        <button
                          type="button"
                          onClick={() => retryItem(item)}
                          className="shrink-0 text-xs text-primary hover:underline"
                        >
                          Retry
                        </button>
                      </div>
                    )}

                    {!isActive && !isError && (
                      <p className="text-[10px] text-muted-foreground">
                        {formatFileSize(item.file.size)}
                        {isDone && ' · Uploaded'}
                        {item.status === 'pending' && mode === 'create' && ' · Pending'}
                      </p>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {mode === 'create' && pendingCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {pendingCount} file{pendingCount !== 1 ? 's' : ''} will upload when the case is created.
            </p>
          )}
        </div>
      )}
    </div>
  )
})

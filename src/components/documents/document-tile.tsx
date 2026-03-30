'use client'

import React, { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Eye, Download, Trash2, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { getFileIcon, getMimeTypeLabel, formatFileSize } from '@/lib/utils/format'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { DocumentModel } from '@/services/documents.service'
import type { DocumentType } from '@/types/database.types'

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

// types

interface DocumentTileProps {
  document: DocumentModel
  onView?: () => void
  onDelete?: () => void
  onDownload?: () => void
  /** When provided the category label becomes clickable and shows an inline editor */
  onUpdateDocType?: (docType: DocumentType) => void
  isUploading?: boolean
}

// file icon background by type

function fileIconBg(mimeType: string | null): string {
  if (!mimeType) return 'bg-muted'
  if (mimeType === 'application/pdf') return 'bg-primary/10'
  if (mimeType.startsWith('image/')) return 'bg-primary/10'
  return 'bg-muted'
}

function fileIconColor(mimeType: string | null): string {
  if (!mimeType) return 'text-muted-foreground'
  if (mimeType === 'application/pdf') return 'text-primary'
  if (mimeType.startsWith('image/')) return 'text-primary'
  return 'text-muted-foreground'
}

// shimmer placeholder

function UploadingPlaceholder({ name }: { name: string }) {
  return (
    <div
      role="listitem"
      aria-label="Uploading document"
      className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
    >
      <div className="h-10 w-10 shrink-0 rounded-lg bg-muted animate-pulse" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full border-2 border-muted-foreground/30 border-t-primary animate-spin" />
          <span className="text-sm text-muted-foreground truncate">{name}</span>
        </div>
        <div className="h-2 w-24 rounded-full bg-muted animate-pulse" />
      </div>
    </div>
  )
}

// component

export function DocumentTile({
  document: doc,
  onView,
  onDelete,
  onDownload,
  onUpdateDocType,
  isUploading = false,
}: DocumentTileProps) {
  const [editingType, setEditingType] = useState(false)

  if (isUploading) {
    return <UploadingPlaceholder name={doc.name} />
  }

  const fileIcon = getFileIcon(doc.mime_type ?? '')
  const typeLabel = getMimeTypeLabel(doc.mime_type ?? '')
  const sizeLabel = doc.file_size ? formatFileSize(doc.file_size) : null
  const dateLabel = formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })
  const categoryLabel = DOC_TYPE_LABEL[doc.doc_type] ?? 'Other'

  function handleTypeChange(newType: DocumentType) {
    onUpdateDocType?.(newType)
    setEditingType(false)
  }

  return (
    <div
      role="listitem"
      aria-label={`Document: ${doc.name}`}
      className="group flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-shadow duration-200 cursor-pointer hover:shadow-md"
    >
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
          fileIconBg(doc.mime_type),
        )}
      >
        {React.createElement(fileIcon, {
          className: cn('h-5 w-5', fileIconColor(doc.mime_type)),
          'aria-hidden': true,
        })}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground line-clamp-2 wrap-break-word">
          {doc.name}
        </p>

        {editingType ? (
          <div className="mt-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Select value={doc.doc_type} onValueChange={(v) => handleTypeChange(v as DocumentType)}>
              <SelectTrigger className="h-6 text-xs px-2 w-36 border-primary/50">
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
          <p className="mt-0.5 text-xs text-muted-foreground">
            {onUpdateDocType ? (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setEditingType(true) }}
                title="Click to change category"
                className="inline-flex items-center gap-0.5 hover:text-primary transition-colors group/cat"
                aria-label={`Category: ${categoryLabel}. Click to edit.`}
              >
                {categoryLabel}
                <Pencil
                  className="h-2.5 w-2.5 opacity-0 group-hover/cat:opacity-60 transition-opacity ml-0.5"
                  aria-hidden="true"
                />
              </button>
            ) : (
              <span>{categoryLabel}</span>
            )}
            <span className="mx-1">·</span>
            {typeLabel}
            {sizeLabel && <span> · {sizeLabel}</span>}
            <span> · {dateLabel}</span>
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1 md:opacity-0 md:group-hover:opacity-100 md:transition-opacity">
        {onView && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onView}
            aria-label={`View ${doc.name}`}
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
        {onDownload && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onDownload}
            aria-label={`Download ${doc.name}`}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
            aria-label={`Delete ${doc.name}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { FileText, File, Loader2, X, RefreshCw } from 'lucide-react'
import { useDocumentsByCase } from '@/hooks/use-documents'
import { cn } from '@/lib/utils/cn'

export interface SelectedDocument {
  id: string
  name: string
  mimeType: string
  type: 'pdf' | 'image'
  textContent?: string
  base64?: string
  mediaType?: string
}

interface DocumentPickerProps {
  caseId: string
  onSelect: (doc: SelectedDocument) => void
  onClose: () => void
}

export function DocumentPicker({ caseId, onSelect, onClose }: DocumentPickerProps) {
  const { data: documents = [], isLoading } = useDocumentsByCase(caseId)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [errorId, setErrorId] = useState<string | null>(null)

  async function handleDocSelect(doc: {
    id: string
    name: string
    file_path: string
    mime_type: string | null
    doc_type: string
  }) {
    const mimeType = doc.mime_type ?? 'application/octet-stream'
    const isImage = mimeType.startsWith('image/')
    const isPDF = mimeType === 'application/pdf'

    if (!isImage && !isPDF) {
      //unsupported (just pass basic info, let AI handle it)
      onSelect({ id: doc.id, name: doc.name, mimeType, type: 'pdf' })
      onClose()
      return
    }

    setProcessingId(doc.id)
    setErrorId(null)

    try {
      const res = await fetch('/api/documents/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: doc.file_path,
          mimeType,
          documentId: doc.id,
        }),
      })

      if (!res.ok) {
        setErrorId(doc.id)
        setProcessingId(null)
        return
      }

      const processed = (await res.json()) as {
        type: 'pdf' | 'image'
        text?: string
        base64?: string
        mediaType?: string
        pageCount?: number
        truncated?: boolean
      }

      onSelect({
        id: doc.id,
        name: doc.name,
        mimeType,
        type: processed.type,
        textContent: processed.text,
        base64: processed.base64,
        mediaType: processed.mediaType,
      })
      onClose()
    } catch {
      setErrorId(doc.id)
      setProcessingId(null)
    }
  }

  return (
    <div className="w-[280px] rounded-lg border border-border bg-popover shadow-md">
      <div className="border-b border-border px-3 py-2">
        <p className="text-xs font-medium text-muted-foreground">Select document</p>
      </div>
      <div className="max-h-[240px] overflow-y-auto p-1">
        {isLoading && (
          <div className="px-3 py-4 text-center text-xs text-muted-foreground">Loading…</div>
        )}
        {!isLoading && documents.length === 0 && (
          <div className="px-3 py-4 text-center space-y-1">
            <p className="text-xs text-muted-foreground">No documents uploaded yet</p>
            <p className="text-xs text-muted-foreground">Upload documents to the case first</p>
          </div>
        )}
        {documents.map((doc) => {
          const isProcessing = processingId === doc.id
          const hasError = errorId === doc.id
          const isDisabled = processingId !== null && !isProcessing

          return (
            <div
              key={doc.id}
              role="button"
              tabIndex={isDisabled || isProcessing ? -1 : 0}
              onClick={() => {
                if (!isDisabled && !isProcessing) void handleDocSelect(doc)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  if (!isDisabled && !isProcessing) void handleDocSelect(doc)
                }
              }}
              aria-disabled={isDisabled || isProcessing}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs transition-colors',
                isProcessing && 'bg-accent cursor-wait',
                hasError && 'text-destructive',
                !isProcessing && !hasError && !isDisabled && 'hover:bg-accent cursor-pointer',
                isDisabled && 'opacity-40 cursor-not-allowed',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-amber-500" />
              ) : hasError ? (
                <X className="h-4 w-4 shrink-0 text-destructive" />
              ) : doc.mime_type?.startsWith('image/') ? (
                <File className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}

              <span className="flex-1 truncate">
                {isProcessing ? (
                  <span className="text-amber-600 dark:text-amber-400">Extracting content…</span>
                ) : hasError ? (
                  <span className="text-destructive">Could not read - try another</span>
                ) : (
                  doc.name
                )}
              </span>

              {hasError && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setErrorId(null)
                    void handleDocSelect(doc)
                  }}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  title="Retry"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              )}

              {!isProcessing && !hasError && (
                <span className="shrink-0 text-[10px] text-muted-foreground">{doc.doc_type}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

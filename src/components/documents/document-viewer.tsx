'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Download, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useDocumentSignedUrl } from '@/hooks/use-documents'
import type { DocumentModel } from '@/services/documents.service'
import { useIsMobile } from '@/hooks/use-online'

// pdf viewer (iframe-based, SSR-safe)

interface PdfViewerProps {
  url: string
  name: string
}

function PdfViewer({ url, name }: PdfViewerProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
        <FileText className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Could not load PDF. Try downloading instead.</p>
      </div>
    )
  }

  return (
    <div className="relative flex-1 w-full overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      )}
      <iframe
        src={url}
        title={name}
        className="w-full h-full border-0"
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false)
          setError(true)
        }}
      />
    </div>
  )
}

// image viewer

interface ImageViewerProps {
  url: string
  name: string
}

function ImageViewer({ url, name }: ImageViewerProps) {
  return (
    <div
      className="relative flex-1 w-full min-h-0 overflow-hidden"
      style={{ touchAction: 'pinch-zoom' }}
    >
      <Image
        src={url}
        alt={name}
        fill
        className="object-contain"
        sizes="(max-width: 768px) 100vw, 896px"
        unoptimized
      />
    </div>
  )
}

// unsupported type fallback

interface UnsupportedViewerProps {
  name: string
  url: string
}

function UnsupportedViewer({ name, url }: UnsupportedViewerProps) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center px-4">
      <FileText className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Preview not available</p>
        <p className="text-xs text-muted-foreground">Download to view this file</p>
      </div>
      <Button asChild>
        <a href={url} download={name} target="_blank" rel="noopener noreferrer">
          <Download className="h-4 w-4 mr-2" aria-hidden="true" />
          Download to view
        </a>
      </Button>
    </div>
  )
}

// viewer content

interface ViewerContentProps {
  document: DocumentModel
  onClose: () => void
}

function ViewerContent({ document: doc, onClose }: ViewerContentProps) {
  const { data: signedUrl, isLoading, error } = useDocumentSignedUrl(doc.file_path)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
        </div>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ) : error || !signedUrl ? (
          <div className="flex flex-col flex-1 items-center justify-center gap-3 text-center px-4">
            <FileText className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Could not load file. Try again.</p>
          </div>
        ) : doc.mime_type === 'application/pdf' ? (
          <PdfViewer url={signedUrl} name={doc.name} />
        ) : doc.mime_type?.startsWith('image/') ? (
          <ImageViewer url={signedUrl} name={doc.name} />
        ) : (
          <UnsupportedViewer name={doc.name} url={signedUrl} />
        )}
      </div>
    </div>
  )
}

// main component

interface DocumentViewerProps {
  document: DocumentModel | null
  isOpen: boolean
  onClose: () => void
}

export function DocumentViewer({ document: doc, isOpen, onClose }: DocumentViewerProps) {
  const isMobile = useIsMobile()

  if (!doc) return null

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          side="bottom"
          className="h-(--viewer-sheet-height) p-0 rounded-t-xl flex flex-col overflow-hidden"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{doc.name}</SheetTitle>
          </SheetHeader>
          <ViewerContent document={doc} onClose={onClose} />
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-(--viewer-dialog-height) p-0 flex flex-col overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>{doc.name}</DialogTitle>
        </DialogHeader>
        <ViewerContent document={doc} onClose={onClose} />
      </DialogContent>
    </Dialog>
  )
}


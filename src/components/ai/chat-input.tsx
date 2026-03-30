'use client'

import { useState, useRef, useCallback } from 'react'
import { Paperclip, ImagePlus, Send, X, FileText, Image as ImageIcon, Loader2, CheckCircle2, Square } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DocumentPicker } from '@/components/ai/document-picker'
import { processUploadedFile } from '@/lib/ai/document-processor'
import { cn } from '@/lib/utils/cn'
import type { MessageType, PromptType } from '@/lib/ai/types'
import type { SelectedDocument } from '@/components/ai/document-picker'

interface UploadedFileState {
  name: string
  mimeType: string
  type: 'pdf' | 'image'
  textContent?: string
  base64?: string
  mediaType?: string
  sizeKB?: number
  pageCount?: number
  truncated?: boolean
}

export interface SendParams {
  message: string
  messageType?: MessageType
  promptType?: PromptType
  promptLabel?: string
  documentContext?: string
  documentName?: string
  imageBase64?: string
  imageMediaType?: string
}

interface ChatInputProps {
  onSend: (params: SendParams) => void
  isLoading: boolean
  creditBalance: number
  caseId: string
  isThinking?: boolean
  isStreaming?: boolean
  onStop?: () => void
}

export function ChatInput({
  onSend,
  isLoading,
  caseId,
  isThinking = false,
  isStreaming = false,
  onStop,
}: ChatInputProps) {
  const [inputText, setInputText] = useState('')
  const [isDocPickerOpen, setIsDocPickerOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<SelectedDocument | null>(null)
  const [uploadedFile, setUploadedFile] = useState<UploadedFileState | null>(null)
  const [isProcessingFile, setIsProcessingFile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleFileSelect = useCallback(async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum 5MB.')
      return
    }

    setIsProcessingFile(true)
    setUploadedFile(null)

    try {
      const processed = await processUploadedFile(file)

      setUploadedFile({
        name: file.name,
        mimeType: file.type,
        type: processed.type,
        textContent: processed.text,
        base64: processed.base64,
        mediaType: processed.mediaType,
        sizeKB: processed.sizeKB,
        pageCount: processed.pageCount,
        truncated: processed.truncated,
      })

      if (processed.truncated) {
        toast.info('Uploaded document successfully.', { duration: 3000 })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not process file'
      if (msg.includes('no readable text') || msg.includes('No readable text')) {
        toast.error('PDF has no readable text. Try a different document.')
      } else if (msg.includes('too large') || msg.includes('Too large')) {
        toast.error('Image too large. Resize to under 5MB.')
      } else if (msg.includes('Unsupported')) {
        toast.error(msg)
      } else {
        toast.error('Upload failed. Check your connection.')
      }
    } finally {
      setIsProcessingFile(false)
    }
  }, [])

  const handleSend = useCallback(() => {
    const trimmed = inputText.trim()
    if (!trimmed && !uploadedFile && !selectedDocument) return
    if (isLoading || isProcessingFile) return

    const message =
      trimmed ||
      (uploadedFile ? `Please analyze this file: ${uploadedFile.name}` : '') ||
      (selectedDocument ? `Please analyze this document: ${selectedDocument.name}` : '')

    const hasImage =
      uploadedFile?.type === 'image' || selectedDocument?.type === 'image'
    const hasPDF =
      (uploadedFile?.type === 'pdf' && !!uploadedFile.textContent) ||
      (selectedDocument?.type === 'pdf' && !!selectedDocument.textContent)

    let messageType: MessageType = 'text'
    if (selectedDocument || uploadedFile) {
      messageType = hasImage ? 'file_upload' : 'document_ref'
    }

    const documentContext =
      selectedDocument?.textContent ?? uploadedFile?.textContent

    const imageBase64 = selectedDocument?.base64 ?? uploadedFile?.base64
    const imageMediaType = selectedDocument?.mediaType ?? uploadedFile?.mediaType

    const documentName = selectedDocument?.name ?? uploadedFile?.name

    onSend({
      message,
      messageType,
      documentContext: hasPDF ? documentContext : undefined,
      documentName,
      imageBase64: hasImage ? imageBase64 : undefined,
      imageMediaType: hasImage ? imageMediaType : undefined,
    })

    setInputText('')
    setSelectedDocument(null)
    setUploadedFile(null)

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [inputText, uploadedFile, selectedDocument, onSend, isLoading, isProcessingFile])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isActive = isThinking || isStreaming
  const canSend =
    (inputText.trim().length > 0 || !!uploadedFile || !!selectedDocument) &&
    !isLoading &&
    !isProcessingFile &&
    !isActive

  return (
    <div className="">
      {isProcessingFile && (
        <div className="mb-2 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Processing document…</span>
        </div>
      )}

      {(selectedDocument || uploadedFile) && !isProcessingFile && (
        <div className="mb-2 flex items-center gap-1.5">
          {selectedDocument && (
            <FilePill
              name={selectedDocument.name}
              type={selectedDocument.type}
              onRemove={() => setSelectedDocument(null)}
            />
          )}
          {uploadedFile && (
            <FilePill
              name={uploadedFile.name}
              type={uploadedFile.type}
              pageCount={uploadedFile.pageCount}
              sizeKB={uploadedFile.sizeKB}
              onRemove={() => setUploadedFile(null)}
            />
          )}
        </div>
      )}

      {isDocPickerOpen && (
        <div className="absolute bottom-20 left-4 z-50">
          <DocumentPicker
            caseId={caseId}
            onSelect={(doc) => setSelectedDocument(doc)}
            onClose={() => setIsDocPickerOpen(false)}
          />
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex gap-1 pb-1">
          <button
            type="button"
            title="Reference case document"
            onClick={() => setIsDocPickerOpen((v) => !v)}
            disabled={isLoading || isActive}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Upload file for analysis"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isActive || isProcessingFile}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
          >
            {isProcessingFile ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
          </button>
        </div>

        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
          }}
          onKeyDown={handleKeyDown}
          disabled={isLoading || isActive}
          placeholder="Ask anything about this case…"
          rows={1}
          className={cn(
            'flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm',
            'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'min-h-[36px] max-h-[120px] overflow-y-auto',
          )}
        />

        <Button
          type="button"
          size="icon"
          aria-label={isActive ? 'Stop generating' : 'Send message'}
          onClick={isActive ? onStop : handleSend}
          disabled={isActive ? !onStop : !canSend}
          className={cn(
            'h-9 w-9 shrink-0 transition-all duration-150',
            isActive
              ? 'bg-foreground text-background hover:bg-foreground/80 opacity-100 cursor-pointer'
              : canSend
                ? 'opacity-100'
                : 'opacity-40',
          )}
        >
          {isActive ? (
            <Square className="h-3.5 w-3.5 fill-current" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFileSelect(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}

interface FilePillProps {
  name: string
  type: 'pdf' | 'image'
  pageCount?: number
  sizeKB?: number
  onRemove: () => void
}

function FilePill({ name, type, pageCount, sizeKB, onRemove }: FilePillProps) {
  return (
    <div className="flex max-w-[220px] items-center gap-1.5 rounded-lg border border-green-500/30 bg-green-500/10 px-2.5 py-1.5 text-xs dark:bg-green-900/20">
      <div className="flex shrink-0 items-center gap-1 text-green-700 dark:text-green-400">
        {type === 'image' ? (
          <ImageIcon className="h-3 w-3" />
        ) : (
          <FileText className="h-3 w-3" />
        )}
        <CheckCircle2 className="h-3 w-3" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{name}</p>
        {type === 'pdf' && pageCount !== undefined && (
          <p className="text-[10px] text-muted-foreground">
            {pageCount} page{pageCount !== 1 ? 's' : ''} extracted
          </p>
        )}
        {type === 'image' && sizeKB !== undefined && (
          <p className="text-[10px] text-muted-foreground">{sizeKB} KB</p>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 shrink-0 opacity-60 hover:opacity-100"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

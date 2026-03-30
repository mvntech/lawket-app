'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { UploadCloud, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useUploadDocument } from '@/hooks/use-documents'
import { isValidFileType, isValidFileSize, formatFileSize } from '@/lib/utils/format'
import { StorageError } from '@/types/common.types'
import type { DocumentModel } from '@/services/documents.service'
import type { DocumentType } from '@/types/database.types'

// types

interface DocumentUploadProps {
  caseId: string
  userId: string
  docType?: DocumentType
  onSuccess?: (doc: DocumentModel) => void
  compact?: boolean
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error'

// component

export function DocumentUpload({ caseId, userId, docType, onSuccess, compact = false }: DocumentUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const upload = useUploadDocument()

  const handleFile = useCallback(
    async (file: File) => {
      // client-side validation first (no network request)
      if (!isValidFileType(file.type)) {
        setErrorMessage('File type not supported. Allowed: PDF, JPEG, PNG, WebP, HEIC.')
        setUploadState('error')
        return
      }
      if (!isValidFileSize(file.size)) {
        setErrorMessage(`File exceeds 50MB limit. (${formatFileSize(file.size)})`)
        setUploadState('error')
        return
      }

      setUploadingFileName(file.name)
      setUploadState('uploading')
      setProgress(0)

      // simulate progress (indeterminate - real XHR progress would require custom fetch)
      const interval = setInterval(() => {
        setProgress((p) => (p < 85 ? p + 5 : p))
      }, 200)

      try {
        const doc = await upload.mutateAsync({
          file,
          caseId,
          userId,
          metadata: { name: file.name, doc_type: docType },
        })
        clearInterval(interval)
        setProgress(100)
        setUploadState('success')

        setTimeout(() => {
          setUploadState('idle')
          setProgress(0)
          setUploadingFileName(null)
          onSuccess?.(doc)
        }, 2000)
      } catch (err) {
        clearInterval(interval)
        if (err instanceof StorageError) {
          const msg = err.message.toLowerCase()
          if (msg.includes('50mb') || msg.includes('exceeds')) {
            setErrorMessage('File exceeds 50MB limit.')
          } else if (msg.includes('type not supported') || msg.includes('allowed')) {
            setErrorMessage('File type not supported.')
          } else {
            setErrorMessage(err.message)
          }
        } else {
          setErrorMessage('Upload failed. Please try again.')
        }
        setUploadState('error')
      }
    },
    [caseId, userId, upload, onSuccess],
  )

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/heic': ['.heic'],
    },
    maxFiles: 1,
    disabled: uploadState === 'uploading',
  })

  const reset = () => {
    setUploadState('idle')
    setErrorMessage(null)
    setUploadingFileName(null)
    setProgress(0)
  }

  const minHeight = compact ? 'min-h-[100px]' : 'min-h-[160px]'

  return (
    <div>
      {uploadState === 'idle' || uploadState === 'error' ? (
        <div
          {...getRootProps()}
          style={{
            transform: isDragActive ? 'scale(1.02)' : 'scale(1)',
            transition: 'transform 0.15s ease',
          }}
          className={cn(
            'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed cursor-pointer transition-colors',
            minHeight,
            isDragActive
              ? 'border-primary bg-amber-50 dark:bg-amber-950/20'
              : 'border-border hover:border-muted-foreground/50 hover:bg-muted/30',
          )}
        >
          <input {...getInputProps()} />

          <AnimatePresence mode="wait">
            {uploadState === 'error' ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-2 px-4 text-center"
              >
                <AlertCircle className="h-7 w-7 text-destructive" aria-hidden="true" />
                <p className="text-sm font-medium text-destructive">{errorMessage}</p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    reset()
                  }}
                  className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                >
                  Try again
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-2 px-4 text-center"
              >
                <UploadCloud
                  className={cn('h-8 w-8', isDragActive ? 'text-primary' : 'text-muted-foreground')}
                  aria-hidden="true"
                />
                <p className="text-sm font-medium text-foreground">
                  {isDragActive ? 'Drop to upload' : 'Drop files here or click to upload'}
                </p>
                {!compact && (
                  <p className="text-xs text-muted-foreground">PDF, JPEG, PNG, WebP up to 50MB</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : uploadState === 'uploading' ? (
        <div
          className={cn(
            'flex flex-col items-center justify-center rounded-lg border border-border bg-muted/20',
            minHeight,
            'gap-3 px-4',
          )}
        >
          <p className="text-sm text-foreground truncate max-w-full">{uploadingFileName}</p>
          <div className="w-full max-w-xs">
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: 'easeOut' }}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {progress < 100 ? `Uploading… ${progress}%` : 'Finalizing…'}
          </p>
        </div>
      ) : (
        // success
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            'flex flex-col items-center justify-center rounded-lg border border-border',
            minHeight,
            'gap-2',
          )}
        >
          <CheckCircle className="h-7 w-7 text-emerald-500" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">Uploaded successfully</p>
        </motion.div>
      )}
    </div>
  )
}

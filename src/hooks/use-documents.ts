'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { documentsService } from '@/services/documents.service'
import type { DocumentModel, UploadDocumentInput } from '@/services/documents.service'
import { queryKeys } from '@/lib/constants/query-keys'
import { StorageError } from '@/types/common.types'

const DOCUMENTS_STALE_TIME = 1000 * 60 * 5   // 5 minutes
const SIGNED_URL_STALE_TIME = 1000 * 60 * 50 // 50 minutes
const SIGNED_URL_GC_TIME = 1000 * 60 * 60    // 60 minutes

// read hooks

export function useAllDocuments(userId: string) {
  return useQuery({
    queryKey: queryKeys.documents.all(),
    queryFn: () => documentsService.getAllForUser(userId),
    enabled: !!userId,
    staleTime: DOCUMENTS_STALE_TIME,
  })
}

export function useDocumentsByCase(caseId: string) {
  return useQuery({
    queryKey: queryKeys.documents.byCase(caseId),
    queryFn: () => documentsService.getByCase(caseId),
    enabled: !!caseId,
    staleTime: DOCUMENTS_STALE_TIME,
  })
}

export function useDocumentSignedUrl(filePath: string | null) {
  return useQuery({
    queryKey: queryKeys.documents.signedUrl(filePath),
    queryFn: () => documentsService.getSignedUrl(filePath!),
    enabled: !!filePath,
    staleTime: SIGNED_URL_STALE_TIME,
    gcTime: SIGNED_URL_GC_TIME,
  })
}

// mutation hooks

interface UploadVariables {
  file: File
  caseId: string
  userId: string
  metadata: UploadDocumentInput
}

interface OptimisticDocument extends DocumentModel {
  _isUploading: true
}

export function useUploadDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ file, caseId, userId, metadata }: UploadVariables) =>
      documentsService.upload(file, caseId, userId, metadata),

    onMutate: async ({ file, caseId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.documents.byCase(caseId) })

      const previous = queryClient.getQueryData<DocumentModel[]>(
        queryKeys.documents.byCase(caseId),
      )

      const placeholder: OptimisticDocument = {
        id: `uploading-${Date.now()}`,
        case_id: caseId,
        user_id: '',
        name: file.name,
        file_path: '',
        file_size: file.size,
        mime_type: file.type,
        doc_type: 'other',
        notes: null,
        is_deleted: false,
        deleted_at: null,
        created_at: new Date().toISOString(),
        _synced: false,
        _isUploading: true,
      }

      queryClient.setQueryData<DocumentModel[]>(
        queryKeys.documents.byCase(caseId),
        (old) => [placeholder, ...(old ?? [])],
      )

      return { previous, caseId }
    },

    onError: (err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(
          queryKeys.documents.byCase(context.caseId),
          context.previous,
        )
      }

      if (err instanceof StorageError) {
        const msg = err.message.toLowerCase()
        if (msg.includes('50mb') || msg.includes('exceeds')) {
          toast.error('File exceeds 50MB limit.')
        } else if (msg.includes('type not supported') || msg.includes('allowed')) {
          toast.error('File type not supported.')
        } else {
          toast.error('Upload failed. Please try again.')
        }
      } else {
        toast.error('Upload failed. Please try again.')
      }
    },

    onSuccess: (doc, _vars, context) => {
      // replace placeholder with real document
      queryClient.setQueryData<DocumentModel[]>(
        queryKeys.documents.byCase(context?.caseId ?? doc.case_id),
        (old) =>
          (old ?? []).map((d) =>
            d.id.startsWith('uploading-') ? doc : d,
          ),
      )
      toast.success('Document uploaded successfully.')
    },

    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.byCase(vars.caseId) })
    },
  })
}

export function useSoftDeleteDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, filePath }: { id: string; filePath: string }) =>
      documentsService.softDelete(id, filePath),

    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.documents.all() })

      const previousQueries = queryClient.getQueriesData<DocumentModel[]>({
        queryKey: queryKeys.documents.all(),
      })

      queryClient.setQueriesData<DocumentModel[]>(
        { queryKey: queryKeys.documents.all() },
        (old) => (Array.isArray(old) ? old.filter((d) => d.id !== id) : old),
      )

      return { previousQueries }
    },

    onError: (_err, _vars, context) => {
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(key, data)
        }
      }
      toast.error('Failed to remove document. Please try again.')
    },

    onSuccess: () => {
      toast.success('Document removed successfully.')
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.all() })
    },
  })
}

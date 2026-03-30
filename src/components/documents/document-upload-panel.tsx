'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DocumentUpload } from '@/components/documents/document-upload'
import { useCases } from '@/hooks/use-cases'
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

interface DocumentUploadPanelProps {
  userId: string
  onSuccess: () => void
}

export function DocumentUploadPanel({ userId, onSuccess }: DocumentUploadPanelProps) {
  const { data: cases } = useCases()
  const caseList = cases ?? []

  const [selectedCaseId, setSelectedCaseId] = useState<string>(caseList[0]?.id ?? '')
  const [docType, setDocType] = useState<DocumentType>('other')

  if (caseList.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No cases found. Add a case first to upload documents.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="upload-panel-case">Select case</Label>
        <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
          <SelectTrigger id="upload-panel-case">
            <SelectValue placeholder="Choose a case" />
          </SelectTrigger>
          <SelectContent>
            {caseList.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <span className="font-medium">{c.title}</span>
                <span className="ml-1.5 text-xs text-muted-foreground">{c.case_number}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="upload-panel-doc-type">Document category</Label>
        <Select value={docType} onValueChange={(v) => setDocType(v as DocumentType)}>
          <SelectTrigger id="upload-panel-doc-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DOC_TYPE_OPTIONS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedCaseId && (
        <DocumentUpload
          caseId={selectedCaseId}
          userId={userId}
          docType={docType}
          onSuccess={onSuccess}
        />
      )}
    </div>
  )
}

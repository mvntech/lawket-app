'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusBadge } from '@/components/shared/status-badge'
import type { CaseStatus } from '@/types/common.types'

const STATUS_OPTIONS: { value: CaseStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'closed', label: 'Closed' },
  { value: 'archived', label: 'Archived' },
]

interface CaseStatusSelectProps {
  value: CaseStatus
  onChange: (status: CaseStatus) => void
  disabled?: boolean
}

export function CaseStatusSelect({ value, onChange, disabled }: CaseStatusSelectProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as CaseStatus)} disabled={disabled}>
      <SelectTrigger>
        <SelectValue>
          <StatusBadge status={value} size="sm" />
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map(({ value: v, label }) => (
          <SelectItem key={v} value={v}>
            <div className="flex items-center gap-2">
              <StatusBadge status={v} size="sm" />
              <span>{label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

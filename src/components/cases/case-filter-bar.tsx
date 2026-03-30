'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CaseStatus, CaseType } from '@/types/common.types'

type StatusFilter = CaseStatus | 'all'
type TypeFilter = CaseType | 'all'

interface CaseFilterBarProps {
  onSearchChange: (search: string) => void
  onStatusChange: (status: StatusFilter) => void
  onTypeChange: (type: TypeFilter) => void
  activeStatus: StatusFilter
  activeType: TypeFilter
  totalCount: number
}

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'closed', label: 'Closed' },
  { value: 'archived', label: 'Archived' },
]

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'All categories' },
  { value: 'civil', label: 'Civil' },
  { value: 'criminal', label: 'Criminal' },
  { value: 'family', label: 'Family' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'property', label: 'Property' },
  { value: 'constitutional', label: 'Constitutional' },
  { value: 'tax', label: 'Tax' },
  { value: 'labour', label: 'Labour' },
  { value: 'other', label: 'Other' },
]

export function CaseFilterBar({
  onSearchChange,
  onStatusChange,
  onTypeChange,
  activeStatus,
  activeType,
  totalCount,
}: CaseFilterBarProps) {
  const [search, setSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onSearchChange(search)
    }, 500)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search, onSearchChange])

  const clearSearch = () => {
    setSearch('')
    onSearchChange('')
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
          aria-hidden="true"
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, client, or case number…"
          className="pl-9 pr-9"
          aria-label="Search cases"
        />
        {search && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Status */}
        <Select value={activeStatus} onValueChange={(v) => onStatusChange(v as StatusFilter)}>
          <SelectTrigger className="h-8 text-xs w-auto min-w-[120px]" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(({ value, label }) => (
              <SelectItem key={value} value={value} className="text-xs">
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Case type */}
        <Select value={activeType} onValueChange={(v) => onTypeChange(v as TypeFilter)}>
          <SelectTrigger className="h-8 text-xs w-auto min-w-[130px]" aria-label="Filter by case type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map(({ value, label }) => (
              <SelectItem key={value} value={value} className="text-xs">
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-xs text-muted-foreground ml-auto shrink-0">
          {totalCount} {totalCount === 1 ? 'case' : 'cases'}
        </span>
      </div>
    </div>
  )
}

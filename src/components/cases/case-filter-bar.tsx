'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils/cn'
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
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'closed', label: 'Closed' },
  { value: 'archived', label: 'Archived' },
]

export function CaseFilterBar({
  onSearchChange,
  onStatusChange,
  onTypeChange: _onTypeChange,
  activeStatus,
  activeType: _activeType,
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

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => onStatusChange(value)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                activeStatus === value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <span className="text-xs text-muted-foreground ml-auto shrink-0">
          {totalCount} {totalCount === 1 ? 'case' : 'cases'}
        </span>
      </div>
    </div>
  )
}

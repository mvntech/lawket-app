'use client'

import { FileText, Scale, ScanText, NotebookPen, PenLine } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { PROMPT_CHIPS } from '@/lib/ai/types'
import type { PromptChip } from '@/lib/ai/types'

const ICON_MAP: Record<string, React.ElementType> = {
  FileText,
  Scale,
  ScanText,
  NotebookPen,
  PenLine,
}

interface PromptChipsProps {
  onSelect: (chip: PromptChip) => void
  creditBalance: number
  hasHearing: boolean
  hasDocuments: boolean
  isLoading: boolean
}

export function PromptChips({
  onSelect,
  creditBalance,
  hasHearing,
  hasDocuments,
  isLoading,
}: PromptChipsProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-center flex-wrap gap-2">
        {PROMPT_CHIPS.map((chip) => {
          const Icon = ICON_MAP[chip.icon] ?? FileText
          const isDisabledHearing = chip.requiresHearing && !hasHearing
          const isDisabledDoc = chip.requiresDocument && !hasDocuments
          const isDisabledCredits = creditBalance < chip.creditCost
          const isDisabled = isLoading || isDisabledHearing || isDisabledDoc || isDisabledCredits

          let title = chip.description
          if (isDisabledHearing) title = 'Add a hearing first'
          else if (isDisabledDoc) title = 'Upload a document first'
          else if (isDisabledCredits) title = 'AI rate limit reached'

          return (
            <button
              key={chip.type}
              type="button"
              title={title}
              disabled={isDisabled}
              onClick={() => !isDisabled && onSelect(chip)}
              className={cn(
                'relative flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors',
                isDisabled
                  ? 'cursor-not-allowed opacity-40'
                  : 'cursor-pointer hover:bg-accent',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{chip.label}</span>
              <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-black">
                {chip.creditCost}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

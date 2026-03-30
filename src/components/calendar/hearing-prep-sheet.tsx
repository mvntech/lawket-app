'use client'

import { useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { AIResponseCard } from '@/components/ai/ai-response-card'
import { useHearingPrepAI } from '@/hooks/use-ai'
import { useUpdateHearing } from '@/hooks/use-hearings'
import { toast } from 'sonner'
import type { HearingModel } from '@/services/hearings.service'
import type { CaseModel } from '@/services/cases.service'

interface HearingPrepSheetProps {
  hearing: HearingModel | null
  caseData: CaseModel | null
  isOpen: boolean
  onClose: () => void
}

export function HearingPrepSheet({ hearing, caseData, isOpen, onClose }: HearingPrepSheetProps) {
  const ai = useHearingPrepAI()
  const updateHearing = useUpdateHearing()

  useEffect(() => {
    if (isOpen && hearing && caseData) {
      ai.reset()
      void ai.request({
        hearingTitle: hearing.title,
        hearingDate: hearing.hearing_date,
        hearingTime: hearing.hearing_time,
        courtName: hearing.court_name,
        judgeName: hearing.judge_name,
        caseTitle: caseData.title,
        caseType: caseData.case_type,
        clientName: caseData.client_name,
        opposingParty: caseData.opposing_party,
        caseDescription: caseData.description,
        caseNotes: caseData.notes,
      })
    }
  }, [isOpen])

  const subtitle = hearing
    ? `${hearing.title} - ${format(parseISO(hearing.hearing_date), 'PPP')}`
    : ''

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto pb-safe rounded-t-xl">
        <SheetHeader className="pb-4">
          <SheetTitle>Hearing preparation</SheetTitle>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </SheetHeader>

        <AIResponseCard
          isStreaming={ai.isStreaming}
          content={ai.content}
          isLoading={ai.isLoading}
          title="Preparation guide"
          onSave={(text) => {
            if (!hearing) return
            updateHearing.mutate(
              { id: hearing.id, data: { notes: text } },
              {
                onSuccess: () => {
                  toast.success('Prep notes saved.')
                  onClose()
                },
              },
            )
          }}
          onDiscard={onClose}
        />

        {ai.error && <p className="mt-3 text-sm text-destructive">{ai.error}</p>}
      </SheetContent>
    </Sheet>
  )
}

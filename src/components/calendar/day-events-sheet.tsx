'use client'

import { useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { FormPanel } from '@/components/shared/form-panel'
import { HearingCard } from '@/components/calendar/hearing-card'
import { DeadlineCard } from '@/components/calendar/deadline-card'
import { groupByCase } from '@/lib/utils/calendar'
import type { HearingModel } from '@/services/hearings.service'
import type { DeadlineModel } from '@/services/deadlines.service'
import type { CaseModel } from '@/services/cases.service'

// types

interface DayEventsSheetProps {
  date: Date
  hearings: HearingModel[]
  deadlines: DeadlineModel[]
  cases: CaseModel[]
  isOpen: boolean
  onClose: () => void
  onAddHearing: () => void
  onAddDeadline: () => void
  clickedEventId?: string
  onEditHearing?: (hearing: HearingModel) => void
  onDeleteHearing?: (id: string) => void
  onEditDeadline?: (deadline: DeadlineModel) => void
  onDeleteDeadline?: (id: string) => void
  onCompleteDeadline?: (id: string) => void
}

// component

export function DayEventsSheet({
  date,
  hearings,
  deadlines,
  cases,
  isOpen,
  onClose,
  onAddHearing,
  onAddDeadline,
  clickedEventId,
  onEditHearing,
  onDeleteHearing,
  onEditDeadline,
  onDeleteDeadline,
  onCompleteDeadline,
}: DayEventsSheetProps) {
  const highlightRefs = useRef(new Map<string, HTMLDivElement>())

  const caseGroups = groupByCase(hearings, deadlines, cases)
  const isEmpty = hearings.length === 0 && deadlines.length === 0

  // Scroll to and highlight the clicked event
  useEffect(() => {
    if (!clickedEventId || !isOpen) return
    const el = highlightRefs.current.get(clickedEventId)
    if (!el) return

    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    el.style.outline = '2px solid var(--color-primary, #f59e0b)'
    el.style.outlineOffset = '2px'
    el.style.borderRadius = '0.5rem'

    const timer = setTimeout(() => {
      el.style.outline = ''
      el.style.outlineOffset = ''
    }, 600)

    return () => clearTimeout(timer)
  }, [clickedEventId, isOpen])

  // build subtitle: "2 hearings · 1 deadline"
  const subtitle = [
    hearings.length > 0 && `${hearings.length} hearing${hearings.length > 1 ? 's' : ''}`,
    deadlines.length > 0 && `${deadlines.length} deadline${deadlines.length > 1 ? 's' : ''}`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <FormPanel
      isOpen={isOpen}
      onClose={onClose}
      title={format(date, 'EEEE, d MMMM yyyy')}
      subtitle={subtitle || undefined}
      size="md"
      footer={
        <div className="flex gap-2">
          <Button variant="default" size="sm" className="flex-1" onClick={onAddHearing}>
            Add hearing
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={onAddDeadline}>
            Add deadline
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {caseGroups.map((group, idx) => {
          const hearingCount = group.hearings.length
          const deadlineCount = group.deadlines.length
          const countLabel = [
            hearingCount > 0 && `${hearingCount} hearing${hearingCount > 1 ? 's' : ''}`,
            deadlineCount > 0 && `${deadlineCount} deadline${deadlineCount > 1 ? 's' : ''}`,
          ]
            .filter(Boolean)
            .join(' · ')

          return (
            <div key={group.caseId}>
                            <div className="flex items-center justify-between px-1 mb-2">
                <span className="text-sm font-semibold text-foreground truncate">
                  {group.caseTitle}
                </span>
                <span className="text-xs text-muted-foreground shrink-0 ml-3">{countLabel}</span>
              </div>

                            <div className="space-y-2">
                {group.hearings.map((h) => (
                  <div
                    key={h.id}
                    ref={(el) => {
                      if (el) highlightRefs.current.set(`hearing-${h.id}`, el)
                    }}
                  >
                    <HearingCard
                      hearing={h}
                      showCase={false}
                      onEdit={onEditHearing ? () => onEditHearing(h) : undefined}
                      onDelete={onDeleteHearing ? () => onDeleteHearing(h.id) : undefined}
                    />
                  </div>
                ))}

                {group.deadlines.map((d) => (
                  <div
                    key={d.id}
                    ref={(el) => {
                      if (el) highlightRefs.current.set(`deadline-${d.id}`, el)
                    }}
                  >
                    <DeadlineCard
                      deadline={d}
                      showCase={false}
                      onEdit={onEditDeadline ? () => onEditDeadline(d) : undefined}
                      onDelete={onDeleteDeadline ? () => onDeleteDeadline(d.id) : undefined}
                      onComplete={onCompleteDeadline ? () => onCompleteDeadline(d.id) : undefined}
                    />
                  </div>
                ))}
              </div>

                            {idx < caseGroups.length - 1 && <div className="mt-4 border-t border-border" />}
            </div>
          )
        })}

        {isEmpty && (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nothing scheduled for this day.
          </p>
        )}
      </div>
    </FormPanel>
  )
}

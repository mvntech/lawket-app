'use client'

import { useRef, useState, useMemo, useCallback } from 'react'
import FullCalendar from '@fullcalendar/react'
import type { CalendarApi, DatesSetArg, EventClickArg, EventInput } from '@fullcalendar/core'
import type { DateClickArg } from '@fullcalendar/interaction'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import { parseISO, format } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PageHeader } from '@/components/shared/page-header'
import { CalendarSkeleton } from '@/components/shared/loading-skeleton'
import { ErrorState } from '@/components/shared/error-state'
import { DayEventsSheet } from '@/components/calendar/day-events-sheet'
import { HearingForm } from '@/components/calendar/hearing-form'
import { DeadlineForm } from '@/components/calendar/deadline-form'
import type { HearingFormHandle } from '@/components/calendar/hearing-form'
import type { DeadlineFormHandle } from '@/components/calendar/deadline-form'
import { FormPanel } from '@/components/shared/form-panel'
import { FormPanelFooter } from '@/components/shared/form-panel-footer'
import { useHearingsByDateRange, useSoftDeleteHearing } from '@/hooks/use-hearings'
import { useUpcomingDeadlines, useSoftDeleteDeadline, useMarkDeadlineComplete } from '@/hooks/use-deadlines'
import { analytics } from '@/lib/analytics'
import { cn } from '@/lib/utils/cn'
import type { HearingModel } from '@/services/hearings.service'
import type { DeadlineModel } from '@/services/deadlines.service'
import type { CaseModel } from '@/services/cases.service'
import type { DeadlinePriority } from '@/types/common.types'

// constants

const DEADLINE_PRIORITY_COLORS: Record<DeadlinePriority, string> = {
  critical: '#ef4444',
  high: '#92400e',
  medium: '#3b82f6',
  low: '#9ca3af',
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

type CalendarView = 'dayGridMonth' | 'timeGridWeek' | 'listMonth'
type UserFacingView = 'month' | 'week' | 'agenda'

const VIEW_MAP: Record<UserFacingView, CalendarView> = {
  month: 'dayGridMonth',
  week: 'timeGridWeek',
  agenda: 'listMonth',
}

// helpers

function buildEventTitle(prefix: string | undefined, title: string): string {
  if (!prefix) return title
  const trimmed = prefix.length > 20 ? `${prefix.substring(0, 20)}…` : prefix
  return `${trimmed}: ${title}`
}

function formatMoreLink(n: number): string {
  return `+${n} more`
}

// MonthYearPicker

function MonthYearPicker({
  currentDate,
  onSelect,
}: {
  currentDate: Date
  onSelect: (year: number, month: number) => void
}) {
  const [year, setYear] = useState(currentDate.getFullYear())
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()

  return (
    <div className="p-3 w-56">
      <div className="flex items-center justify-between mb-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setYear((y) => y - 1)}
          aria-label="Previous year"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="text-sm font-semibold tabular-nums">{year}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setYear((y) => y + 1)}
          aria-label="Next year"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {MONTH_LABELS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => onSelect(year, i)}
            className={cn(
              'rounded-md px-2 py-1.5 text-sm transition-colors',
              year === currentYear && i === currentMonth
                ? 'bg-primary text-primary-foreground font-semibold'
                : 'text-foreground hover:bg-accent',
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

// props

interface CalendarClientProps {
  userId: string
  initialCases: CaseModel[]
}

// main component

export function CalendarClient({ initialCases }: CalendarClientProps) {
  const calendarRef = useRef<FullCalendar>(null)
  const defaultView = useMemo<UserFacingView>(
    () => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'agenda' : 'month'),
    [],
  )

  // ui state
  const [activeView, setActiveView] = useState<UserFacingView>(defaultView)
  const [currentTitle, setCurrentTitle] = useState(() => format(new Date(), 'MMMM yyyy'))
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [monthPickerOpen, setMonthPickerOpen] = useState(false)

  // tracks whether FullCalendar has completed its first render
  // so we don't flash a skeleton on every date navigation
  const [initialized, setInitialized] = useState(false)

  const [calendarRange, setCalendarRange] = useState<{ from: Date; to: Date }>(() => {
    const now = new Date()
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    }
  })

  // sheet / panel state
  const [daySheetOpen, setDaySheetOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [clickedEventId, setClickedEventId] = useState<string | undefined>(undefined)
  const [hearingFormOpen, setHearingFormOpen] = useState(false)
  const [hearingLoading, setHearingLoading] = useState(false)
  const [deadlineFormOpen, setDeadlineFormOpen] = useState(false)
  const [deadlineLoading, setDeadlineLoading] = useState(false)
  const [editingHearing, setEditingHearing] = useState<HearingModel | null>(null)
  const [editingDeadline, setEditingDeadline] = useState<DeadlineModel | null>(null)
  const [prefillCaseId, setPrefillCaseId] = useState('')
  const [prefillDate, setPrefillDate] = useState('')

  const hearingFormRef = useRef<HearingFormHandle>(null)
  const deadlineFormRef = useRef<DeadlineFormHandle>(null)

  // data hooks
  const {
    data: hearings = [],
    isLoading: hearingsLoading,
    error: hearingsError,
    refetch: refetchHearings,
  } = useHearingsByDateRange(calendarRange.from, calendarRange.to)

  const {
    data: deadlines = [],
    isLoading: deadlinesLoading,
    error: deadlinesError,
    refetch: refetchDeadlines,
  } = useUpcomingDeadlines(60)

  const softDeleteHearing = useSoftDeleteHearing()
  const softDeleteDeadline = useSoftDeleteDeadline()
  const markComplete = useMarkDeadlineComplete()

  const hasError = hearingsError || deadlinesError
  // only block the UI on the very first data load - never on navigation
  const showSkeleton = !initialized && (hearingsLoading || deadlinesLoading)

  // calendar api

  const getApi = (): CalendarApi | undefined => calendarRef.current?.getApi()

  const handlePrev = useCallback(() => getApi()?.prev(), [])
  const handleNext = useCallback(() => getApi()?.next(), [])

  const handleViewChange = useCallback((view: UserFacingView) => {
    setActiveView(view)
    getApi()?.changeView(VIEW_MAP[view])
    analytics.calendarViewChanged(view)
  }, [])

  // fullcalendar callbacks

  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    setInitialized(true)
    setCalendarRange({ from: arg.start, to: arg.end })
    setCurrentTitle(arg.view.title)
    // currentStart is the first day of the actual period (e.g. March 1 in month view)
    setCurrentDate(arg.view.currentStart)
  }, [])

  const handleDateClick = useCallback((arg: DateClickArg) => {
    setSelectedDate(parseISO(arg.dateStr))
    setClickedEventId(undefined)
    setDaySheetOpen(true)
  }, [])

  const handleEventClick = useCallback((arg: EventClickArg) => {
    const dateStr = arg.event.startStr.split('T')[0]
    setSelectedDate(parseISO(dateStr))
    setClickedEventId(arg.event.id)
    setDaySheetOpen(true)
  }, [])

  // month picker

  const handleMonthPick = useCallback((year: number, month: number) => {
    getApi()?.gotoDate(new Date(year, month, 1))
    setMonthPickerOpen(false)
  }, [])

  // event mapping (memoized)

  const events = useMemo<EventInput[]>(
    () => [
      ...hearings.map((h): EventInput => ({
        id: `hearing-${h.id}`,
        title: buildEventTitle(h.case_number ?? h.case_title?.substring(0, 20), h.title),
        start: h.hearing_date,
        end: h.hearing_date,
        backgroundColor: 'var(--primary)',
        borderColor: 'var(--primary)',
        textColor: 'var(--primary-foreground)',
        extendedProps: {
          type: 'hearing',
          id: h.id,
          caseId: h.case_id,
          caseTitle: h.case_title,
          caseNumber: h.case_number,
        },
      })),
      ...deadlines.map((d): EventInput => {
        const color = DEADLINE_PRIORITY_COLORS[d.priority as DeadlinePriority] ?? '#9ca3af'
        return {
          id: `deadline-${d.id}`,
          title: buildEventTitle(d.case_number ?? d.case_title?.substring(0, 20), d.title),
          start: d.due_date,
          end: d.due_date,
          backgroundColor: color,
          borderColor: color,
          textColor: '#fff',
          classNames: d.is_completed ? ['fc-event-completed'] : [],
          extendedProps: {
            type: 'deadline',
            id: d.id,
            caseId: d.case_id,
            caseTitle: d.case_title,
            caseNumber: d.case_number,
          },
        }
      }),
    ],
    [hearings, deadlines],
  )

  // sheet helpers

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd')
  const sheetHearings = hearings.filter((h) => h.hearing_date === selectedDateStr)
  const sheetDeadlines = deadlines.filter((d) => d.due_date === selectedDateStr)

  const openAddHearing = useCallback((caseId = '', date = '') => {
    setPrefillCaseId(caseId)
    setPrefillDate(date)
    setEditingHearing(null)
    setDaySheetOpen(false)
    setHearingFormOpen(true)
  }, [])

  const openAddDeadline = useCallback((caseId = '', date = '') => {
    setPrefillCaseId(caseId)
    setPrefillDate(date)
    setEditingDeadline(null)
    setDaySheetOpen(false)
    setDeadlineFormOpen(true)
  }, [])

  // memoized sheet callbacks
  const handleSheetClose = useCallback(() => setDaySheetOpen(false), [])
  const handleSheetAddHearing = useCallback(
    () => openAddHearing('', selectedDateStr),
    [openAddHearing, selectedDateStr],
  )
  const handleSheetAddDeadline = useCallback(
    () => openAddDeadline('', selectedDateStr),
    [openAddDeadline, selectedDateStr],
  )
  const handleEditHearing = useCallback((h: HearingModel) => {
    setEditingHearing(h)
    setDaySheetOpen(false)
    setHearingFormOpen(true)
  }, [])
  const handleDeleteHearing = useCallback(
    (id: string) => { void softDeleteHearing.mutateAsync(id) },
    [softDeleteHearing],
  )
  const handleEditDeadline = useCallback((d: DeadlineModel) => {
    setEditingDeadline(d)
    setDaySheetOpen(false)
    setDeadlineFormOpen(true)
  }, [])
  const handleDeleteDeadline = useCallback(
    (id: string) => { void softDeleteDeadline.mutateAsync(id) },
    [softDeleteDeadline],
  )
  const handleCompleteDeadline = useCallback(
    (id: string) => { void markComplete.mutateAsync(id) },
    [markComplete],
  )

  // render

  if (hasError && !hearingsLoading && !deadlinesLoading) {
    return (
      <ErrorState
        onRetry={() => {
          void refetchHearings()
          void refetchDeadlines()
        }}
      />
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <PageHeader
        title="Calendar"
        subtitle="Manage your hearings and deadlines"
        action={
          <>
            <div className="hidden md:flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => openAddHearing()}>
                <Plus className="h-4 w-4" />
                Add hearing
              </Button>
              <Button variant="outline" size="sm" onClick={() => openAddDeadline()}>
                <Plus className="h-4 w-4" />
                Add deadline
              </Button>
            </div>

            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" className="h-8 w-8" aria-label="Add event">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openAddHearing()}>
                    <CalendarIcon className="h-4 w-4 mr-2 text-amber-500" />
                    Add hearing
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openAddDeadline()}>
                    <Clock className="h-4 w-4 mr-2 text-orange-500" />
                    Add deadline
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        }
      />

      <div className="flex-1 px-4 md:px-6 pb-6 pt-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handlePrev}
                aria-label="Previous"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Popover open={monthPickerOpen} onOpenChange={setMonthPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-3 font-semibold text-sm min-w-[140px] text-center"
                    aria-label="Select month"
                  >
                    {currentTitle}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <MonthYearPicker currentDate={currentDate} onSelect={handleMonthPick} />
                </PopoverContent>
              </Popover>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleNext}
                aria-label="Next"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex rounded-md border overflow-hidden">
              {(['month', 'week', 'agenda'] as UserFacingView[]).map((view) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => handleViewChange(view)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                    activeView === view
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-foreground hover:bg-accent',
                  )}
                >
                  {view}
                </button>
              ))}
            </div>
          </div>

          {showSkeleton ? (
            <CalendarSkeleton />
          ) : (
            <div className="fc-lawket rounded-lg border overflow-hidden bg-card">
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                initialView={VIEW_MAP[defaultView]}
                headerToolbar={false}
                events={events}
                datesSet={handleDatesSet}
                dateClick={handleDateClick}
                eventClick={handleEventClick}
                height="auto"
                dayMaxEvents={3}
                moreLinkText={formatMoreLink}
                nowIndicator
                selectable={false}
              />
            </div>
          )}
        </div>
      </div>

      <DayEventsSheet
        date={selectedDate}
        hearings={sheetHearings}
        deadlines={sheetDeadlines}
        cases={initialCases}
        isOpen={daySheetOpen}
        onClose={handleSheetClose}
        clickedEventId={clickedEventId}
        onAddHearing={handleSheetAddHearing}
        onAddDeadline={handleSheetAddDeadline}
        onEditHearing={handleEditHearing}
        onDeleteHearing={handleDeleteHearing}
        onEditDeadline={handleEditDeadline}
        onDeleteDeadline={handleDeleteDeadline}
        onCompleteDeadline={handleCompleteDeadline}
      />

      <FormPanel
        isOpen={hearingFormOpen}
        onClose={() => {
          setHearingFormOpen(false)
          setEditingHearing(null)
        }}
        title={editingHearing ? 'Edit hearing' : 'Add hearing'}
        subtitle={editingHearing ? 'Edit the hearing details' : 'Add a new hearing to your calendar'}
        size="md"
        isLoading={hearingLoading}
        footer={
          <FormPanelFooter
            onCancel={() => {
              setHearingFormOpen(false)
              setEditingHearing(null)
            }}
            submitLabel={editingHearing ? 'Save changes' : 'Add hearing'}
            isLoading={hearingLoading}
            onSubmit={() => hearingFormRef.current?.submit()}
          />
        }
      >
        <HearingForm
          ref={hearingFormRef}
          mode={editingHearing ? 'edit' : 'create'}
          caseId={editingHearing?.case_id ?? prefillCaseId}
          cases={initialCases}
          initialData={editingHearing ?? undefined}
          prefillDate={editingHearing ? undefined : prefillDate}
          hideSubmitButton
          onLoadingChange={setHearingLoading}
          onSuccess={() => {
            setHearingFormOpen(false)
            setEditingHearing(null)
          }}
          onCancel={() => {
            setHearingFormOpen(false)
            setEditingHearing(null)
          }}
        />
      </FormPanel>

      <FormPanel
        isOpen={deadlineFormOpen}
        onClose={() => {
          setDeadlineFormOpen(false)
          setEditingDeadline(null)
        }}
        title={editingDeadline ? 'Edit deadline' : 'Add deadline'}
        subtitle={editingDeadline ? 'Edit the deadline details' : 'Add a new deadline to your calendar'}
        size="md"
        isLoading={deadlineLoading}
        footer={
          <FormPanelFooter
            onCancel={() => {
              setDeadlineFormOpen(false)
              setEditingDeadline(null)
            }}
            submitLabel={editingDeadline ? 'Save changes' : 'Add deadline'}
            isLoading={deadlineLoading}
            onSubmit={() => deadlineFormRef.current?.submit()}
          />
        }
      >
        <DeadlineForm
          ref={deadlineFormRef}
          mode={editingDeadline ? 'edit' : 'create'}
          caseId={editingDeadline?.case_id ?? prefillCaseId}
          cases={initialCases}
          initialData={editingDeadline ?? undefined}
          prefillDate={editingDeadline ? undefined : prefillDate}
          hideSubmitButton
          onLoadingChange={setDeadlineLoading}
          onSuccess={() => {
            setDeadlineFormOpen(false)
            setEditingDeadline(null)
          }}
          onCancel={() => {
            setDeadlineFormOpen(false)
            setEditingDeadline(null)
          }}
        />
      </FormPanel>
    </div>
  )
}

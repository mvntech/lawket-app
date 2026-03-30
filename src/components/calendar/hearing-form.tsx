'use client'

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@/lib/utils/form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sparkles } from 'lucide-react'
import { createHearingSchema, updateHearingSchema } from '@/lib/validations/hearing.schema'
import type { CreateHearingInput } from '@/lib/validations/hearing.schema'
import { useCreateHearing, useUpdateHearing } from '@/hooks/use-hearings'
import { useCreateDeadline } from '@/hooks/use-deadlines'
import { useSuggestDeadlines } from '@/hooks/use-ai'
import { PriorityBadge } from '@/components/shared/priority-badge'
import { toast } from 'sonner'
import type { HearingModel } from '@/services/hearings.service'
import type { CaseModel } from '@/services/cases.service'
import { ROUTES } from '@/lib/constants/routes'

// types

export interface HearingFormHandle {
  submit: () => void
}

interface HearingFormProps {
  mode: 'create' | 'edit'
  caseId: string
  cases: CaseModel[]
  initialData?: HearingModel
  prefillDate?: string
  onSuccess?: () => void
  onCancel?: () => void
  hideSubmitButton?: boolean
  onLoadingChange?: (loading: boolean) => void
}

// component

export const HearingForm = forwardRef<HearingFormHandle, HearingFormProps>(
  function HearingForm(
    {
      mode,
      caseId,
      cases,
      initialData,
      prefillDate,
      onSuccess,
      onCancel,
      hideSubmitButton = false,
      onLoadingChange,
    },
    ref,
  ) {
    const schema = mode === 'create' ? createHearingSchema : updateHearingSchema
    const createHearing = useCreateHearing()
    const updateHearing = useUpdateHearing()
    const createDeadline = useCreateDeadline()
    const deadlineSuggest = useSuggestDeadlines()
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [uncheckedDeadlines, setUncheckedDeadlines] = useState<Set<number>>(new Set())

    const {
      register,
      handleSubmit,
      control,
      getValues,
      setValue,
      formState: { errors, isSubmitting },
      reset,
    } = useForm<CreateHearingInput>({
      resolver: zodResolver(schema),
      defaultValues: {
        case_id: initialData?.case_id ?? caseId,
        title: initialData?.title ?? '',
        hearing_date: initialData?.hearing_date ?? prefillDate ?? '',
        hearing_time: initialData?.hearing_time ?? undefined,
        court_name: initialData?.court_name ?? undefined,
        court_room: initialData?.court_room ?? undefined,
        judge_name: initialData?.judge_name ?? undefined,
        notes: initialData?.notes ?? undefined,
      },
    })

    const isFormPending = isSubmitting || createHearing.isPending || updateHearing.isPending

    useEffect(() => {
      onLoadingChange?.(isFormPending)
    }, [isFormPending, onLoadingChange])

    // auto-populate court_name and judge_name from the selected case (create mode only)
    const watchedCaseId = useWatch({ control, name: 'case_id' })
    useEffect(() => {
      if (mode !== 'create' || !watchedCaseId) return
      const selectedCase = cases.find((c) => c.id === watchedCaseId)
      if (!selectedCase) return
      if (selectedCase.court_name) {
        setValue('court_name', selectedCase.court_name, { shouldDirty: false })
      }
      if (selectedCase.judge_name) {
        setValue('judge_name', selectedCase.judge_name, { shouldDirty: false })
      }
    }, [watchedCaseId, cases, mode, setValue])

    useEffect(() => {
      if (initialData) {
        reset({
          case_id: initialData.case_id,
          title: initialData.title,
          hearing_date: initialData.hearing_date,
          hearing_time: initialData.hearing_time ?? undefined,
          court_name: initialData.court_name ?? undefined,
          court_room: initialData.court_room ?? undefined,
          judge_name: initialData.judge_name ?? undefined,
          notes: initialData.notes ?? undefined,
        })
      }
    }, [initialData, reset])

    const onSubmit = async (data: CreateHearingInput) => {
      if (mode === 'create') {
        await createHearing.mutateAsync(data)
        const selectedCase = cases.find((c) => c.id === data.case_id)
        if (selectedCase && data.hearing_date) {
          setShowSuggestions(true)
          deadlineSuggest.reset()
          await deadlineSuggest.suggest({
            caseType: selectedCase.case_type,
            hearingDate: data.hearing_date,
            caseTitle: selectedCase.title,
          })
        } else {
          onSuccess?.()
        }
      } else if (initialData) {
        await updateHearing.mutateAsync({ id: initialData.id, data })
        onSuccess?.()
      }
    }

    useImperativeHandle(ref, () => ({
      submit: () => void handleSubmit(onSubmit)(),
    }))

    const handleAddDeadlines = async () => {
      const selectedCase = cases.find((c) => c.id === getValues('case_id'))
      const selected = deadlineSuggest.deadlines.filter((_, i) => !uncheckedDeadlines.has(i))
      for (const d of selected) {
        await createDeadline.mutateAsync({
          case_id: selectedCase?.id ?? caseId,
          title: d.title,
          due_date: d.due_date,
          priority: d.priority as 'low' | 'medium' | 'high' | 'critical',
        })
      }
      toast.success(`${selected.length} deadline${selected.length !== 1 ? 's' : ''} added automatically.`)
      onSuccess?.()
    }

    const today = new Date().toISOString().split('T')[0]
    const noCases = cases.length === 0

    return (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="case_id">Case</Label>
          <Controller
            name="case_id"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={noCases || (!!caseId && mode === 'create')}
              >
                <SelectTrigger id="case_id" aria-invalid={!!errors.case_id}>
                  <SelectValue placeholder={noCases ? 'No cases available' : 'Select case'} />
                </SelectTrigger>
                <SelectContent>
                  {cases.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="font-medium">{c.title}</span>
                      <span className="ml-1.5 text-muted-foreground text-xs">
                        {c.case_number}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {noCases ? (
            <p className="text-xs text-muted-foreground">
              No cases found.{' '}
              <a href={ROUTES.cases.new} className="text-primary underline-offset-2 hover:underline">
                Add a case
              </a>{' '}
              to continue.
            </p>
          ) : (
            errors.case_id && (
              <p className="text-xs text-destructive">{errors.case_id.message}</p>
            )
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="e.g. First hearing"
            aria-invalid={!!errors.title}
            {...register('title')}
          />
          {errors.title && (
            <p className="text-xs text-destructive">{errors.title.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="hearing_date">Date</Label>
            <Input
              id="hearing_date"
              type="date"
              min={mode === 'create' ? today : undefined}
              aria-invalid={!!errors.hearing_date}
              {...register('hearing_date')}
            />
            {errors.hearing_date && (
              <p className="text-xs text-destructive">{errors.hearing_date.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hearing_time">
              Time
            </Label>
            <Input id="hearing_time" type="time" {...register('hearing_time')} />
          </div>
        </div>

        {(() => {
          const selectedCase = cases.find((c) => c.id === watchedCaseId)
          const isInherited = mode === 'create' && !!selectedCase?.court_name
          return (
            <div className="space-y-1.5">
              <Label htmlFor="court_name">
                Court name <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="court_name"
                placeholder="e.g. Lahore High Court"
                {...register('court_name')}
              />
              {isInherited && (
                <p className="text-xs text-muted-foreground">Inherited from case &#40;you can override this&#41;</p>
              )}
            </div>
          )
        })()}

        {(() => {
          const selectedCase = cases.find((c) => c.id === watchedCaseId)
          const isJudgeInherited = mode === 'create' && !!selectedCase?.judge_name
          return (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="court_room">
                  Room <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input id="court_room" placeholder="e.g. Room 4" {...register('court_room')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="judge_name">
                  Judge <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input id="judge_name" placeholder="e.g. Justice Khan" {...register('judge_name')} />
                {isJudgeInherited && (
                  <p className="text-xs text-muted-foreground">Inherited from case</p>
                )}
              </div>
            </div>
          )
        })()}

        <div className="space-y-1.5">
          <Label htmlFor="notes">
            Notes <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="notes"
            rows={3}
            placeholder="Any additional notes…"
            className="resize-none"
            {...register('notes')}
          />
        </div>

        {!hideSubmitButton && (
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isFormPending} className="flex-1">
              {isFormPending
                ? mode === 'create'
                  ? 'Adding…'
                  : 'Saving…'
                : mode === 'create'
                  ? 'Add hearing'
                  : 'Save changes'}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isFormPending}>
                Cancel
              </Button>
            )}
          </div>
        )}

        {showSuggestions && (
          <div className="mt-4 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500 shrink-0" aria-hidden="true" />
              <span className="text-sm font-medium">AI deadline suggestions</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Based on your case type and hearing date, AI suggests:
            </p>

            {deadlineSuggest.isLoading && (
              <div className="space-y-2 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 bg-muted rounded" />
                ))}
              </div>
            )}

            {!deadlineSuggest.isLoading && deadlineSuggest.deadlines.length > 0 && (
              <div className="space-y-2">
                {deadlineSuggest.deadlines.map((d, i) => (
                  <label key={i} className="flex items-start gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded accent-amber-500"
                      checked={!uncheckedDeadlines.has(i)}
                      onChange={(e) => {
                        setUncheckedDeadlines((prev) => {
                          const next = new Set(prev)
                          if (!e.target.checked) next.add(i)
                          else next.delete(i)
                          return next
                        })
                      }}
                    />
                    <span className="flex-1">
                      <span className="font-medium">{d.title}</span>
                      <span className="text-xs text-muted-foreground ml-2">Due: {d.due_date}</span>
                    </span>
                    <PriorityBadge priority={d.priority as 'low' | 'medium' | 'high' | 'critical'} />
                  </label>
                ))}
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddDeadlines}
                    disabled={
                      uncheckedDeadlines.size === deadlineSuggest.deadlines.length ||
                      createDeadline.isPending
                    }
                  >
                    Add selected deadlines
                  </Button>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                    onClick={() => onSuccess?.()}
                  >
                    Skip
                  </button>
                </div>
              </div>
            )}

            {deadlineSuggest.error && (
              <p className="text-xs text-destructive">{deadlineSuggest.error}</p>
            )}
          </div>
        )}
      </form>
    )
  },
)

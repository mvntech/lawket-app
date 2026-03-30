'use client'

import { forwardRef, useEffect, useImperativeHandle } from 'react'
import { useForm, Controller } from 'react-hook-form'
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
import { PriorityBadge } from '@/components/shared/priority-badge'
import { createDeadlineSchema, updateDeadlineSchema } from '@/lib/validations/deadline.schema'
import type { CreateDeadlineInput } from '@/lib/validations/deadline.schema'
import { useCreateDeadline, useUpdateDeadline } from '@/hooks/use-deadlines'
import type { DeadlineModel } from '@/services/deadlines.service'
import type { CaseModel } from '@/services/cases.service'
import type { DeadlinePriority } from '@/types/common.types'
import { ROUTES } from '@/lib/constants/routes'

// types

const PRIORITY_OPTIONS: DeadlinePriority[] = ['low', 'medium', 'high', 'critical']

export interface DeadlineFormHandle {
  submit: () => void
}

interface DeadlineFormProps {
  mode: 'create' | 'edit'
  caseId: string
  cases: CaseModel[]
  initialData?: DeadlineModel
  prefillDate?: string
  onSuccess?: () => void
  onCancel?: () => void
  hideSubmitButton?: boolean
  onLoadingChange?: (loading: boolean) => void
}

// component

export const DeadlineForm = forwardRef<DeadlineFormHandle, DeadlineFormProps>(
  function DeadlineForm(
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
    const schema = mode === 'create' ? createDeadlineSchema : updateDeadlineSchema
    const createDeadline = useCreateDeadline()
    const updateDeadline = useUpdateDeadline()

    const isPending = createDeadline.isPending || updateDeadline.isPending

    useEffect(() => {
      onLoadingChange?.(isPending)
    }, [isPending, onLoadingChange])

    const {
      register,
      handleSubmit,
      control,
      formState: { errors, isSubmitting },
      reset,
    } = useForm<CreateDeadlineInput>({
      resolver: zodResolver(schema),
      defaultValues: {
        case_id: initialData?.case_id ?? caseId,
        title: initialData?.title ?? '',
        due_date: initialData?.due_date ?? prefillDate ?? '',
        due_time: initialData?.due_time ?? undefined,
        priority: (initialData?.priority as DeadlinePriority) ?? 'medium',
        notes: initialData?.notes ?? undefined,
      },
    })

    useEffect(() => {
      if (initialData) {
        reset({
          case_id: initialData.case_id,
          title: initialData.title,
          due_date: initialData.due_date,
          due_time: initialData.due_time ?? undefined,
          priority: initialData.priority as DeadlinePriority,
          notes: initialData.notes ?? undefined,
        })
      }
    }, [initialData, reset])

    // sync prefillDate into the field whenever it changes (guards against stale
    // defaultValues if the form stays mounted between opens)
    useEffect(() => {
      if (!initialData && prefillDate) {
        reset((prev) => ({ ...prev, due_date: prefillDate }))
      }
    }, [prefillDate, initialData, reset])

    const onSubmit = async (data: CreateDeadlineInput) => {
      if (mode === 'create') {
        await createDeadline.mutateAsync(data)
      } else if (initialData) {
        await updateDeadline.mutateAsync({ id: initialData.id, data })
      }
      onSuccess?.()
    }

    useImperativeHandle(ref, () => ({
      submit: () => void handleSubmit(onSubmit)(),
    }))

    const today = new Date().toISOString().split('T')[0]
    const isLoading = isSubmitting || isPending
    const noCases = cases.length === 0

    return (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="dl_case_id">Case</Label>
          <Controller
            name="case_id"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={noCases || (!!caseId && mode === 'create')}
              >
                <SelectTrigger id="dl_case_id" aria-invalid={!!errors.case_id}>
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
          <Label htmlFor="dl_title">Title</Label>
          <Input
            id="dl_title"
            placeholder="e.g. Submit appeal brief"
            aria-invalid={!!errors.title}
            {...register('title')}
          />
          {errors.title && (
            <p className="text-xs text-destructive">{errors.title.message}</p>
          )}
        </div>

                <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="due_date">Due date</Label>
            <Input
              id="due_date"
              type="date"
              min={mode === 'create' ? today : undefined}
              aria-invalid={!!errors.due_date}
              {...register('due_date')}
            />
            {errors.due_date && (
              <p className="text-xs text-destructive">{errors.due_date.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="due_time">
              Time <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input id="due_time" type="time" {...register('due_time')} />
          </div>
        </div>

                <div className="space-y-1.5">
          <Label htmlFor="dl_priority">Priority</Label>
          <Controller
            name="priority"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="dl_priority" aria-invalid={!!errors.priority}>
                  <SelectValue>
                    {field.value ? (
                      <PriorityBadge priority={field.value as DeadlinePriority} size="sm" />
                    ) : (
                      'Select priority'
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      <PriorityBadge priority={p} size="sm" />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.priority && (
            <p className="text-xs text-destructive">{errors.priority.message}</p>
          )}
        </div>

                <div className="space-y-1.5">
          <Label htmlFor="dl_notes">
            Notes <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="dl_notes"
            rows={3}
            placeholder="Any additional notes…"
            className="resize-none"
            {...register('notes')}
          />
        </div>

        {!hideSubmitButton && (
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading
                ? mode === 'create'
                  ? 'Adding…'
                  : 'Saving…'
                : mode === 'create'
                  ? 'Add deadline'
                  : 'Save changes'}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                Cancel
              </Button>
            )}
          </div>
        )}
      </form>
    )
  },
)

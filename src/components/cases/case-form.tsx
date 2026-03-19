'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
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
import { CaseStatusSelect } from '@/components/cases/case-status-select'
import { zodResolver } from '@/lib/utils/form'
import { createCaseSchema } from '@/lib/validations/case.schema'
import type { CreateCaseInput } from '@/lib/validations/case.schema'
import { useCreateCase, useUpdateCase } from '@/hooks/use-cases'
import { ROUTES } from '@/lib/constants/routes'
import type { CaseModel } from '@/services/cases.service'
import type { CaseStatus, CaseType } from '@/types/common.types'

// types

interface CaseFormProps {
  mode: 'create' | 'edit'
  initialData?: CaseModel
  onSuccess?: (c: CaseModel) => void
}

const CASE_TYPE_OPTIONS: { value: CaseType; label: string }[] = [
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

// component

export function CaseForm({ mode, initialData, onSuccess }: CaseFormProps) {
  const router = useRouter()
  const createCase = useCreateCase()
  const updateCase = useUpdateCase()
  const [showMore, setShowMore] = useState(mode === 'edit')

  const isLoading = createCase.isPending || updateCase.isPending

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
  } = useForm<CreateCaseInput>({
    resolver: zodResolver(createCaseSchema),
    defaultValues:
      mode === 'edit' && initialData
        ? {
          case_number: initialData.case_number,
          title: initialData.title,
          client_name: initialData.client_name,
          case_type: initialData.case_type,
          status: initialData.status,
          client_contact: initialData.client_contact ?? '',
          opposing_party: initialData.opposing_party ?? '',
          court_name: initialData.court_name ?? '',
          judge_name: initialData.judge_name ?? '',
          filed_date: initialData.filed_date ?? '',
          description: initialData.description ?? '',
          notes: initialData.notes ?? '',
        }
        : {
          case_type: 'other',
          status: 'active',
        },
  })

  // warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && !isLoading) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty, isLoading])

  const onSubmit = async (data: CreateCaseInput) => {
    try {
      if (mode === 'create') {
        const created = await createCase.mutateAsync(data)
        onSuccess?.(created)
        router.push(ROUTES.cases.detail(created.id))
      } else if (initialData) {
        const updated = await updateCase.mutateAsync({ id: initialData.id, data })
        onSuccess?.(updated)
        router.push(ROUTES.cases.detail(updated.id))
      }
    } catch {
      // errors handled by mutation onError → toast
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Case Information
        </h2>

        <div className="space-y-1.5">
          <Label htmlFor="case_number">
            Case number <span aria-hidden="true" className="text-destructive">*</span>
          </Label>
          <Input
            id="case_number"
            placeholder="e.g. CR-2024-0441"
            {...register('case_number')}
            aria-invalid={!!errors.case_number}
          />
          {errors.case_number && (
            <p className="text-xs text-destructive">{errors.case_number.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="title">
            Title <span aria-hidden="true" className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            placeholder="e.g. Ahmad v. State"
            {...register('title')}
            aria-invalid={!!errors.title}
          />
          {errors.title && (
            <p className="text-xs text-destructive">{errors.title.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="client_name">
            Client name <span aria-hidden="true" className="text-destructive">*</span>
          </Label>
          <Input
            id="client_name"
            placeholder="Full name of the client"
            {...register('client_name')}
            aria-invalid={!!errors.client_name}
          />
          {errors.client_name && (
            <p className="text-xs text-destructive">{errors.client_name.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="case_type">
              Case type <span aria-hidden="true" className="text-destructive">*</span>
            </Label>
            <Controller
              name="case_type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="case_type" aria-invalid={!!errors.case_type}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CASE_TYPE_OPTIONS.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.case_type && (
              <p className="text-xs text-destructive">{errors.case_type.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="status">
              Status <span aria-hidden="true" className="text-destructive">*</span>
            </Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <CaseStatusSelect
                  value={(field.value ?? 'active') as CaseStatus}
                  onChange={field.onChange}
                />
              )}
            />
            {errors.status && (
              <p className="text-xs text-destructive">{errors.status.message}</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <button
          type="button"
          onClick={() => setShowMore((p) => !p)}
          className="w-full flex items-center justify-between px-6 py-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide hover:bg-muted/40 transition-colors"
          aria-expanded={showMore}
        >
          More details
          {showMore ? (
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          )}
        </button>

        {showMore && (
          <div className="px-6 pb-6 space-y-4 border-t">
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="client_contact">Client contact</Label>
                <Input
                  id="client_contact"
                  placeholder="Phone or email"
                  {...register('client_contact')}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="opposing_party">Opposing party</Label>
                <Input
                  id="opposing_party"
                  placeholder="Name of opposing party"
                  {...register('opposing_party')}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="court_name">Court name</Label>
                <Input
                  id="court_name"
                  placeholder="e.g. Lahore High Court"
                  {...register('court_name')}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="judge_name">Judge name</Label>
                <Input
                  id="judge_name"
                  placeholder="Presiding judge"
                  {...register('judge_name')}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="filed_date">Filed date</Label>
                <Input id="filed_date" type="date" {...register('filed_date')} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={4}
                placeholder="Brief description of the case…"
                {...register('description')}
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={3}
                placeholder="Internal notes…"
                {...register('notes')}
              />
              {errors.notes && (
                <p className="text-xs text-destructive">{errors.notes.message}</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="sm:min-w-[120px]">
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          {mode === 'create' ? 'Create case' : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}

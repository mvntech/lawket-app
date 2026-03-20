'use client'

import { forwardRef, useEffect, useImperativeHandle } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@/lib/utils/form'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createContactSchema } from '@/lib/validations/contact.schema'
import type { CreateContactInput } from '@/lib/validations/contact.schema'
import { useCreateContact, useUpdateContact } from '@/hooks/use-contacts'
import type { ContactModel, ContactRole } from '@/types/common.types'
import { cn } from '@/lib/utils/cn'

// role options

const ROLE_OPTIONS: { value: ContactRole; label: string }[] = [
  { value: 'client', label: 'Client' },
  { value: 'opposing_counsel', label: 'Opposing counsel' },
  { value: 'judge', label: 'Judge' },
  { value: 'witness', label: 'Witness' },
  { value: 'expert', label: 'Expert' },
  { value: 'court_staff', label: 'Court staff' },
  { value: 'other', label: 'Other' },
]

// types

export interface ContactFormHandle {
  submit: () => void
}

interface ContactFormProps {
  mode: 'create' | 'edit'
  initialData?: ContactModel
  defaultRole?: ContactRole
  onSuccess?: (contact: ContactModel) => void
  onCancel?: () => void
  hideSubmitButton?: boolean
  onLoadingChange?: (loading: boolean) => void
}

// component

export const ContactForm = forwardRef<ContactFormHandle, ContactFormProps>(
  function ContactForm(
    {
      mode,
      initialData,
      defaultRole = 'client',
      onSuccess,
      onCancel,
      hideSubmitButton = false,
      onLoadingChange,
    },
    ref,
  ) {
    const createContact = useCreateContact()
    const updateContact = useUpdateContact()

    const isLoading = createContact.isPending || updateContact.isPending

    useEffect(() => {
      onLoadingChange?.(isLoading)
    }, [isLoading, onLoadingChange])

    const {
      register,
      handleSubmit,
      control,
      formState: { errors },
    } = useForm<CreateContactInput>({
      resolver: zodResolver(createContactSchema),
      defaultValues: {
        full_name: initialData?.full_name ?? '',
        role: initialData?.role ?? defaultRole,
        email: initialData?.email ?? '',
        phone: initialData?.phone ?? '',
        organization: initialData?.organization ?? '',
        notes: initialData?.notes ?? '',
      },
    })

    const onSubmit = async (data: CreateContactInput) => {
      if (mode === 'create') {
        const contact = await createContact.mutateAsync(data)
        onSuccess?.(contact)
      } else if (initialData) {
        const contact = await updateContact.mutateAsync({ id: initialData.id, data })
        onSuccess?.(contact)
      }
    }

    useImperativeHandle(ref, () => ({
      submit: () => void handleSubmit(onSubmit)(),
    }))

    return (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        <div className="space-y-1.5">
          <Label htmlFor="full_name">
            Full name <span className="text-destructive ml-0.5">*</span>
          </Label>
          <Input
            id="full_name"
            placeholder="e.g. Ahmad Khan"
            aria-invalid={!!errors.full_name}
            {...register('full_name')}
          />
          {errors.full_name && (
            <p className="text-xs text-destructive">{errors.full_name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="role">
            Role <span className="text-destructive ml-0.5">*</span>
          </Label>
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="role" aria-invalid={!!errors.role}>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.role && (
            <p className="text-xs text-destructive">{errors.role.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="ahmad@example.com"
            aria-invalid={!!errors.email}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+92 300 1234567"
            {...register('phone')}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="organization">Organization</Label>
          <Input
            id="organization"
            placeholder="e.g. Khan & Associates"
            {...register('organization')}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            placeholder="Any relevant notes..."
            rows={3}
            className="resize-none"
            {...register('notes')}
          />
        </div>

        {!hideSubmitButton && (
          <div className={cn('flex gap-3 pt-2', onCancel ? 'justify-between' : 'justify-end')}>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {mode === 'create' ? 'Add contact' : 'Save changes'}
            </Button>
          </div>
        )}
      </form>
    )
  },
)

'use client'

import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

// types

interface FormPanelFooterProps {
  onCancel: () => void
  onSubmit?: () => void
  submitLabel?: string
  cancelLabel?: string
  isLoading?: boolean
  isDisabled?: boolean
  submitVariant?: 'default' | 'destructive'
}

// component

export function FormPanelFooter({
  onCancel,
  onSubmit,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  isLoading,
  isDisabled,
  submitVariant = 'default',
}: FormPanelFooterProps) {
  return (
    <div className="flex items-center gap-3 sm:justify-end">
      <Button
        type="button"
        variant="ghost"
        onClick={onCancel}
        disabled={isLoading}
        className="flex-1 sm:flex-none"
      >
        {cancelLabel}
      </Button>
      <Button
        type={onSubmit ? 'button' : 'submit'}
        onClick={onSubmit}
        disabled={isLoading || isDisabled}
        variant={submitVariant === 'destructive' ? 'destructive' : 'default'}
        className="flex-1 sm:flex-none sm:min-w-[120px]"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </span>
        ) : (
          submitLabel
        )}
      </Button>
    </div>
  )
}

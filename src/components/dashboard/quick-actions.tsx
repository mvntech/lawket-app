'use client'

import { memo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Calendar, Clock, Upload, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormPanel } from '@/components/shared/form-panel'
import { FormPanelFooter } from '@/components/shared/form-panel-footer'
import { HearingForm } from '@/components/calendar/hearing-form'
import { DeadlineForm } from '@/components/calendar/deadline-form'
import type { HearingFormHandle } from '@/components/calendar/hearing-form'
import type { DeadlineFormHandle } from '@/components/calendar/deadline-form'
import { DocumentUploadPanel } from '@/components/documents/document-upload-panel'
import { useCases } from '@/hooks/use-cases'
import { useAuth } from '@/hooks/use-auth'
import { useDisclosure } from '@/hooks/use-disclosure'
import { ROUTES } from '@/lib/constants/routes'
import { analytics } from '@/lib/analytics'
import { cn } from '@/lib/utils/cn'

// action button

interface ActionButtonProps {
  label: string
  icon: React.ReactNode
  onClick: () => void
  iconClass?: string
}

function ActionButton({ label, icon, onClick, iconClass = 'bg-primary/10 text-primary' }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-2.5 rounded-xl border bg-card p-4 min-h-[88px]',
        'transition-all duration-150 active:scale-[0.97]',
        'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', iconClass)}>
        {icon}
      </div>
      <span className="text-xs font-medium text-foreground">{label}</span>
    </button>
  )
}

// component

export const QuickActions = memo(function QuickActions() {
  const router = useRouter()
  const { user } = useAuth()
  const { data: cases } = useCases()

  const hearing = useDisclosure()
  const deadline = useDisclosure()
  const document = useDisclosure()
  const [hearingLoading, setHearingLoading] = useState(false)
  const [deadlineLoading, setDeadlineLoading] = useState(false)

  const hearingFormRef = useRef<HearingFormHandle>(null)
  const deadlineFormRef = useRef<DeadlineFormHandle>(null)

  const caseList = cases ?? []

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <CardTitle className="text-base">Quick actions</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-3">
            <ActionButton
              label="Add case"
              icon={<Plus className="h-5 w-5 text-muted-foreground" aria-hidden="true" />}
              iconClass="bg-muted"
              onClick={() => {
                analytics.quickActionUsed('add_case')
                router.push(ROUTES.cases.new)
              }}
            />
            <ActionButton
              label="Add hearing"
              icon={<Calendar className="h-5 w-5 text-muted-foreground" aria-hidden="true" />}
              iconClass="bg-muted"
              onClick={() => {
                analytics.quickActionUsed('add_hearing')
                hearing.open()
              }}
            />
            <ActionButton
              label="Add deadline"
              icon={<Clock className="h-5 w-5 text-muted-foreground" aria-hidden="true" />}
              iconClass="bg-muted"
              onClick={() => {
                analytics.quickActionUsed('add_deadline')
                deadline.open()
              }}
            />
            <ActionButton
              label="Upload doc"
              icon={<Upload className="h-5 w-5 text-muted-foreground" aria-hidden="true" />}
              iconClass="bg-muted"
              onClick={() => {
                analytics.quickActionUsed('upload_document')
                document.open()
              }}
            />
          </div>
        </CardContent>
      </Card>

      <FormPanel
        isOpen={hearing.isOpen}
        onClose={hearing.close}
        title="Add hearing"
        subtitle="Add a new hearing to your calendar"
        size="md"
        isLoading={hearingLoading}
        footer={
          <FormPanelFooter
            onCancel={hearing.close}
            submitLabel="Add hearing"
            isLoading={hearingLoading}
            onSubmit={() => hearingFormRef.current?.submit()}
          />
        }
      >
        <HearingForm
          ref={hearingFormRef}
          mode="create"
          caseId=""
          cases={caseList}
          hideSubmitButton
          onLoadingChange={setHearingLoading}
          onSuccess={hearing.close}
          onCancel={hearing.close}
        />
      </FormPanel>

      <FormPanel
        isOpen={deadline.isOpen}
        onClose={deadline.close}
        title="Add deadline"
        subtitle="Add a new deadline to your calendar"
        size="md"
        isLoading={deadlineLoading}
        footer={
          <FormPanelFooter
            onCancel={deadline.close}
            submitLabel="Add deadline"
            isLoading={deadlineLoading}
            onSubmit={() => deadlineFormRef.current?.submit()}
          />
        }
      >
        <DeadlineForm
          ref={deadlineFormRef}
          mode="create"
          caseId=""
          cases={caseList}
          hideSubmitButton
          onLoadingChange={setDeadlineLoading}
          onSuccess={deadline.close}
          onCancel={deadline.close}
        />
      </FormPanel>

      <FormPanel
        isOpen={document.isOpen}
        onClose={document.close}
        title="Upload document"
        subtitle="Select a case and category, then drop a file to upload"
        size="sm"
      >
        {user && (
          <DocumentUploadPanel
            userId={user.id}
            onSuccess={document.close}
          />
        )}
      </FormPanel>
    </>
  )
})

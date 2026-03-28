'use client'

import { useState } from 'react'
import { Trash2, RotateCcw, AlertTriangle, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { ListSkeleton } from '@/components/shared/loading-skeleton'
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog'
import { PageHeader } from '@/components/shared/page-header'
import { useDeletedCases, useRestoreCase, usePermanentDeleteCase } from '@/hooks/use-cases'
import { ROUTES } from '@/lib/constants/routes'
import type { CaseModel } from '@/services/cases.service'
import { formatDistanceToNow } from 'date-fns'

export function DeletedCasesClient() {
  const { data: deletedCases = [], isLoading, error, refetch } = useDeletedCases()
  const restore = useRestoreCase()
  const permanentDelete = usePermanentDeleteCase()
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const caseToDelete = deletedCases.find((c) => c.id === confirmDeleteId) ?? null

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="Deleted cases"
          subtitle="Restore or permanently remove deleted cases."
          backHref={ROUTES.settings.root}
        />
        <div className="px-4 md:px-6 py-4">
          <ListSkeleton count={3} />
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <PageHeader title="Deleted cases" backHref={ROUTES.settings.root} />
        <ErrorState onRetry={() => refetch()} />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Deleted cases"
        backHref={ROUTES.settings.root}
      />

      <div className="px-4 md:px-6 py-4 space-y-4 max-w-full">
                <div className="flex items-start gap-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" />
          <p className="text-xs text-muted-foreground">
            Deleted cases are retained for recovery. Permanently deleted cases cannot be recovered.
            All hearings, deadlines, and documents linked to a permanently deleted case will also be removed.
          </p>
        </div>

        {deletedCases.length === 0 ? (
          <EmptyState
            icon={Trash2}
            title="No deleted cases"
            subtitle="Cases you delete will appear here for recovery."
          />
        ) : (
          <div className="space-y-2" role="list">
            {deletedCases.map((c: CaseModel) => (
              <div
                key={c.id}
                role="listitem"
                className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.case_number} · {c.client_name}
                      {c.deleted_at && (
                        <> · Deleted {formatDistanceToNow(new Date(c.deleted_at), { addSuffix: true })}</>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => restore.mutate(c.id)}
                    disabled={restore.isPending}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restore
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setConfirmDeleteId(c.id)}
                    disabled={permanentDelete.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete permanently
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 md:px-6">
      <DeleteConfirmDialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
        onConfirm={async () => {
          if (confirmDeleteId) {
            await permanentDelete.mutateAsync(confirmDeleteId)
            setConfirmDeleteId(null)
          }
        }}
        itemType="case"
        itemName={caseToDelete?.title ?? ''}
        isLoading={permanentDelete.isPending}
        description="This will permanently delete the case and all associated hearings, deadlines, and documents. This action cannot be undone."
      />
      </div>
    </>
  )
}

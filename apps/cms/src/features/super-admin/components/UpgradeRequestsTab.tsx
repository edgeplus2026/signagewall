import { type ColumnDef } from '@tanstack/react-table'
import { CheckIcon, CreditCardIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import type { AdminUpgradeRequest } from '@/features/plans/types/plan.types'
import { ChangePlanDialog } from '@/features/super-admin/components/ChangePlanDialog'
import {
  DEFAULT_PAGE_SIZE,
  useAdminUser,
  useResolveUpgradeRequest,
  useUpgradeRequests,
} from '@/features/super-admin/hooks/useAdminUsers'
import type { AdminUserListItem } from '@/features/super-admin/types/admin.types'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'

type StatusFilter = 'open' | 'resolved' | 'all'

/**
 * The queue of customers waiting on licences — the manual replacement for a
 * checkout. Each row goes straight to the plan editor, and raising a plan
 * resolves that user's open requests server-side.
 */
export function UpgradeRequestsTab() {
  const { t, i18n } = useTranslation()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<StatusFilter>('open')
  const [planUserId, setPlanUserId] = useState<string | null>(null)
  const resolveRequest = useResolveUpgradeRequest()

  const { data, isPending, isFetching } = useUpgradeRequests({
    page,
    limit: DEFAULT_PAGE_SIZE,
    ...(status === 'all' ? {} : { status }),
  })

  // The plan dialog edits a *user*, so the row's user is fetched in full rather
  // than reconstructed from the request — screenLimit and plan must be current,
  // not whatever they were when the request was filed.
  const { data: planUser } = useAdminUser(planUserId)

  const handleResolve = (request: AdminUpgradeRequest) => {
    resolveRequest.mutate(request.id, {
      onSuccess: () => {
        toast.success(t('superAdmin.upgradeRequests.resolved'))
      },
      onError: (error) => {
        toast.error(
          getApiErrorMessage(error, t('superAdmin.upgradeRequests.resolveError')),
        )
      },
    })
  }

  const columns: ColumnDef<AdminUpgradeRequest>[] = [
    {
      accessorKey: 'userName',
      meta: { width: '26%' },
      enableSorting: false,
      header: () => t('superAdmin.upgradeRequests.columns.user'),
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.original.userName}</p>
          <p className="text-secondary truncate text-xs">{row.original.userEmail}</p>
        </div>
      ),
    },
    {
      id: 'request',
      meta: { width: '20%' },
      enableSorting: false,
      header: () => t('superAdmin.upgradeRequests.columns.request'),
      cell: ({ row }) => (
        <span className="text-sm">
          {t('superAdmin.upgradeRequests.delta', {
            from: row.original.screenLimitAtRequest,
            to: row.original.requestedScreens,
          })}
        </span>
      ),
    },
    {
      id: 'contact',
      meta: { width: '20%' },
      enableSorting: false,
      header: () => t('superAdmin.upgradeRequests.columns.contact'),
      cell: ({ row }) => (
        <div className="min-w-0 text-xs">
          <p className="truncate">{row.original.company ?? '—'}</p>
          <p className="text-secondary truncate">{row.original.phone ?? '—'}</p>
        </div>
      ),
    },
    {
      accessorKey: 'createdAt',
      meta: { width: '14%' },
      enableSorting: false,
      header: () => t('superAdmin.upgradeRequests.columns.requestedAt'),
      cell: ({ row }) =>
        new Date(row.original.createdAt).toLocaleDateString(i18n.language, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
    },
    {
      id: 'actions',
      enableSorting: false,
      meta: { align: 'right', width: '20%' },
      header: () => <span className="sr-only">{t('common.actions')}</span>,
      cell: ({ row }) => {
        const request = row.original

        if (request.status === 'resolved') {
          return (
            <div className="flex justify-end">
              <span className="bg-success/10 text-success inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium">
                {t('superAdmin.upgradeRequests.status.resolved')}
              </span>
            </div>
          )
        }

        return (
          <div className="flex justify-end gap-1.5">
            <Button
              size="xs"
              variant="outline"
              onClick={() => {
                handleResolve(request)
              }}
              disabled={resolveRequest.isPending}
            >
              <CheckIcon />
              {t('superAdmin.upgradeRequests.dismiss')}
            </Button>
            <Button
              size="xs"
              onClick={() => {
                setPlanUserId(request.userId)
              }}
            >
              <CreditCardIcon />
              {t('superAdmin.upgradeRequests.setPlan')}
            </Button>
          </div>
        )
      },
    },
  ]

  const requests = data?.items ?? []

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- data is undefined on first load
  if (isPending && !data) {
    return <Skeleton className="h-64 w-full rounded-xl" />
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as StatusFilter)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">
              {t('superAdmin.upgradeRequests.filters.open')}
            </SelectItem>
            <SelectItem value="resolved">
              {t('superAdmin.upgradeRequests.filters.resolved')}
            </SelectItem>
            <SelectItem value="all">
              {t('superAdmin.upgradeRequests.filters.all')}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={requests}
        emptyMessage={t('superAdmin.upgradeRequests.empty')}
        isLoading={isFetching}
        {...(data
          ? {
              pagination: {
                page: data.page,
                pageSize: data.limit,
                total: data.total,
                onPageChange: setPage,
              },
            }
          : {})}
      />

      {requests.some((request) => request.message) ? (
        <div className="border-quaternary flex flex-col gap-3 rounded-xl border p-4">
          <p className="text-primary text-sm font-medium">
            {t('superAdmin.upgradeRequests.messages')}
          </p>
          {requests
            .filter((request) => request.message)
            .map((request) => (
              <div key={request.id} className={cn('text-sm')}>
                <p className="text-secondary text-xs">{request.userEmail}</p>
                <p className="whitespace-pre-wrap">{request.message}</p>
              </div>
            ))}
        </div>
      ) : null}

      <ChangePlanDialog
        open={!!planUserId && !!planUser}
        onOpenChange={(open) => {
          if (!open) setPlanUserId(null)
        }}
        user={
          planUser
            ? ({
                id: planUser.id,
                name: planUser.name,
                email: planUser.email,
                provider: planUser.provider,
                isActive: planUser.isActive,
                isSuperAdmin: planUser.isSuperAdmin,
                organizationCount: planUser.organizations.length,
                plan: planUser.plan,
                screenLimit: planUser.screenLimit,
                trialEndsAt: planUser.trialEndsAt,
                createdAt: planUser.createdAt,
              } satisfies AdminUserListItem)
            : null
        }
      />
    </div>
  )
}

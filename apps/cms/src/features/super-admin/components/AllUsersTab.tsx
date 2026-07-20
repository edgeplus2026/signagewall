import { type ColumnDef, type OnChangeFn, type SortingState } from '@tanstack/react-table'
import {
  EllipsisIcon,
  ShieldIcon,
  ShieldOffIcon,
  Trash2Icon,
  UserRoundIcon,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/features/auth/store/authStore'
import type { AdminUsersSortField } from '@/features/super-admin/api/adminApi'
import { AdminUserSheet } from '@/features/super-admin/components/AdminUserSheet'
import { DeleteUserDialog } from '@/features/super-admin/components/DeleteUserDialog'
import {
  PromoteSuperAdminDialog,
  type SuperAdminRoleAction,
} from '@/features/super-admin/components/PromoteSuperAdminDialog'
import { SwitchUserDialog } from '@/features/super-admin/components/SwitchUserDialog'
import { DEFAULT_PAGE_SIZE, useAdminUsers } from '@/features/super-admin/hooks/useAdminUsers'
import type { AdminUserListItem } from '@/features/super-admin/types/admin.types'
import { getInitials } from '@/lib/initials'
import { cn } from '@/lib/utils'

const DEFAULT_SORTING: SortingState = [{ id: 'createdAt', desc: true }]

function toSortParams(sorting: SortingState): {
  sortBy: AdminUsersSortField
  sortOrder: 'asc' | 'desc'
} {
  const active = sorting[0]
  const sortBy = (active?.id ?? 'createdAt') as AdminUsersSortField

  return {
    sortBy,
    sortOrder: active?.desc ? 'desc' : 'asc',
  }
}

export function AllUsersTab() {
  const { t, i18n } = useTranslation()
  const currentUser = useAuthStore((state) => state.user)
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING)
  const sortParams = toSortParams(sorting)

  const { data, isPending, isFetching } = useAdminUsers({
    page,
    limit: DEFAULT_PAGE_SIZE,
    search: debouncedSearch,
    sortBy: sortParams.sortBy,
    sortOrder: sortParams.sortOrder,
  })

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [roleAction, setRoleAction] = useState<{
    user: AdminUserListItem
    action: SuperAdminRoleAction
  } | null>(null)
  const [switchUser, setSwitchUser] = useState<AdminUserListItem | null>(null)
  const [deleteUser, setDeleteUser] = useState<AdminUserListItem | null>(null)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
    }, 300)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [searchInput])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    setSorting(updater)
    setPage(1)
  }

  const users = data?.items ?? []

  const columns = useMemo<ColumnDef<AdminUserListItem>[]>(
    () => [
      {
        accessorKey: 'name',
        meta: { width: '30%' },
        header: () => t('superAdmin.users.columns.name'),
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5">
            <Avatar size="sm">
              <AvatarFallback>{getInitials(row.original.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium">{row.original.name}</p>
              <p className="text-secondary truncate text-xs">{row.original.email}</p>
            </div>
          </div>
        ),
      },
      {
        id: 'role',
        enableSorting: false,
        meta: { width: '13%' },
        header: () => t('superAdmin.users.columns.role'),
        cell: ({ row }) => (
          <span
            className={cn(
              'inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium',
              row.original.isSuperAdmin
                ? 'bg-brand/10 text-brand'
                : 'bg-secondary/10 text-secondary',
            )}
          >
            {row.original.isSuperAdmin
              ? t('superAdmin.userSheet.role.superAdmin')
              : t('superAdmin.userSheet.role.user')}
          </span>
        ),
      },
      {
        accessorKey: 'organizationCount',
        meta: { width: '14%' },
        header: () => t('superAdmin.users.columns.organizations'),
        cell: ({ row }) => row.original.organizationCount,
      },
      {
        accessorKey: 'isActive',
        meta: { width: '14%' },
        header: () => t('superAdmin.users.columns.status'),
        cell: ({ row }) => (
          <span
            className={cn(
              'inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium',
              row.original.isActive
                ? 'bg-success/10 text-success'
                : 'bg-secondary/10 text-secondary',
            )}
          >
            {row.original.isActive
              ? t('superAdmin.userSheet.status.active')
              : t('superAdmin.userSheet.status.inactive')}
          </span>
        ),
      },
      {
        accessorKey: 'createdAt',
        meta: { width: '18%' },
        header: () => t('superAdmin.users.columns.createdAt'),
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
        meta: { align: 'right', width: '12%' },
        header: () => <span className="sr-only">{t('common.actions')}</span>,
        cell: ({ row }) => {
          const user = row.original
          const isSelf = user.id === currentUser?.id

          if (isSelf) {
            return (
              <div className="flex justify-end">
                <span className="bg-success/10 text-success inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium">
                  {t('superAdmin.users.meBadge')}
                </span>
              </div>
            )
          }

          const canSwitch = user.isActive

          return (
            <div
              className="flex justify-end"
              onClick={(event) => {
                event.stopPropagation()
              }}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="icon-sm">
                    <EllipsisIcon />
                    <span className="sr-only">{t('superAdmin.users.actions.menu')}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-56">
                  {user.isSuperAdmin ? (
                    <DropdownMenuItem
                      onClick={() => {
                        setRoleAction({ user, action: 'demote' })
                      }}
                    >
                      <ShieldOffIcon />
                      {t('superAdmin.users.actions.demote')}
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => {
                        setRoleAction({ user, action: 'promote' })
                      }}
                    >
                      <ShieldIcon />
                      {t('superAdmin.users.actions.promote')}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    disabled={!canSwitch}
                    onClick={() => {
                      setSwitchUser(user)
                    }}
                  >
                    <UserRoundIcon />
                    {t('superAdmin.users.actions.impersonate')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="danger"
                    onClick={() => {
                      setDeleteUser(user)
                    }}
                  >
                    <Trash2Icon />
                    {t('superAdmin.users.actions.delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [t, i18n.language, currentUser?.id],
  )

  if (isPending && !data) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-full max-w-sm" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={users}
        searchPlaceholder={t('superAdmin.users.search')}
        emptyMessage={t('superAdmin.users.empty')}
        isLoading={isFetching}
        onRowClick={(row) => {
          setSelectedUserId(row.id)
        }}
        serverSide={{
          search: searchInput,
          onSearchChange: setSearchInput,
          sorting,
          onSortingChange: handleSortingChange,
        }}
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

      <AdminUserSheet
        userId={selectedUserId}
        open={!!selectedUserId}
        onOpenChange={(open) => {
          if (!open) setSelectedUserId(null)
        }}
      />

      <PromoteSuperAdminDialog
        open={!!roleAction}
        onOpenChange={(open) => {
          if (!open) setRoleAction(null)
        }}
        user={roleAction?.user ?? null}
        action={roleAction?.action ?? 'promote'}
      />

      <SwitchUserDialog
        open={!!switchUser}
        onOpenChange={(open) => {
          if (!open) setSwitchUser(null)
        }}
        user={switchUser}
      />

      <DeleteUserDialog
        open={!!deleteUser}
        onOpenChange={(open) => {
          if (!open) setDeleteUser(null)
        }}
        user={deleteUser}
      />
    </>
  )
}

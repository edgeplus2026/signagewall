import { type ColumnDef } from "@tanstack/react-table"
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuthStore } from "@/features/auth/store/authStore"
import { useIsOrgAdmin } from "@/features/organizations/hooks/useIsOrgAdmin"
import { DeleteUserDialog } from "@/features/users/components/DeleteUserDialog"
import { UserFormSheet } from "@/features/users/components/UserFormSheet"
import { UserRoleIcon } from "@/features/users/components/UserRoleIcon"
import { useUsers } from "@/features/users/hooks/useUsers"
import type { User } from "@/features/users/types/user.types"
import { getInitials } from "@/lib/initials"
import { cn } from "@/lib/utils"

function StatusBadge({ status }: { status: User["status"] }) {
  const { t } = useTranslation()

  return (
    <span
      className={cn(
        "inline-flex max-w-full shrink-0 items-center truncate rounded-md px-2 py-0.5 text-[11px] font-medium",
        status === "approved"
          ? "bg-success/10 text-success"
          : "bg-warning/10 text-warning",
      )}
    >
      {t(`users.status.${status}`)}
    </span>
  )
}

interface UsersTableProps {
  inviteOpen: boolean
  onInviteOpenChange: (open: boolean) => void
}

export function UsersTable({ inviteOpen, onInviteOpenChange }: UsersTableProps) {
  const { t, i18n } = useTranslation()
  const isAdmin = useIsOrgAdmin()
  const currentUser = useAuthStore((state) => state.user)
  const { data: users = [], isLoading } = useUsers()
  const [editUser, setEditUser] = useState<User | null>(null)
  const [deleteUser, setDeleteUser] = useState<User | null>(null)

  // Memoized so it can be an honest dependency of the column memo below —
  // a fresh closure each render would have rebuilt the columns every time.
  const isSelfUser = useCallback(
    (user: User) =>
      !!currentUser &&
      user.email.toLowerCase() === currentUser.email.toLowerCase(),
    [currentUser],
  )

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        accessorKey: "name",
        meta: { width: "24%" },
        header: () => t("users.columns.name"),
        cell: ({ row }) => {
          const name = row.original.name
          const isSelf = isSelfUser(row.original)

          return (
            <div className="flex min-w-0 items-center gap-2.5">
              <Avatar size="sm" className="shrink-0">
                <AvatarFallback>{getInitials(name)}</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 items-center gap-1">
                <span className="min-w-0 truncate font-medium" title={name}>
                  {name}
                </span>
                {isSelf ? (
                  <span className="text-secondary shrink-0 font-normal whitespace-nowrap">
                    ({t("users.meLabel")})
                  </span>
                ) : null}
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: "email",
        meta: { width: "28%" },
        header: () => t("users.columns.email"),
        cell: ({ row }) => (
          <span
            className="text-secondary block truncate"
            title={row.original.email}
          >
            {row.original.email}
          </span>
        ),
      },
      {
        accessorKey: "role",
        meta: { width: "14%" },
        header: () => t("users.columns.role"),
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-2">
            <UserRoleIcon role={row.original.role} className="shrink-0" />
            <span className="min-w-0 truncate">
              {t(`users.roles.${row.original.role}`)}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "status",
        meta: { width: "12%" },
        header: () => t("users.columns.status"),
        cell: ({ row }) => (
          <StatusBadge status={row.original.status} />
        ),
      },
      {
        accessorKey: "createdAt",
        meta: { width: "14%" },
        header: () => t("users.columns.createdAt"),
        cell: ({ row }) => (
          <span className="block truncate whitespace-nowrap">
            {new Date(row.original.createdAt).toLocaleDateString(i18n.language, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
        ),
        sortingFn: "datetime",
      },
      ...(isAdmin
        ? [
            {
              id: "actions",
              enableSorting: false,
              meta: { align: "right" as const, width: "50px" },
              header: () => <span className="sr-only">{t("common.actions")}</span>,
              cell: ({ row }: { row: { original: User } }) => {
                const isSelf = isSelfUser(row.original)

                if (isSelf) {
                  return null
                }

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
                          <MoreHorizontalIcon />
                          <span className="sr-only">{t("common.actions")}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-auto min-w-44">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditUser(row.original)
                          }}
                        >
                          <PencilIcon />
                          {t("users.actions.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="danger"
                          onClick={() => {
                            setDeleteUser(row.original)
                          }}
                        >
                          <Trash2Icon />
                          {t("users.actions.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )
              },
            } satisfies ColumnDef<User>,
          ]
        : []),
    ],
    [t, i18n.language, isAdmin, isSelfUser],
  )

  if (isLoading) {
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
        searchPlaceholder={t("users.search")}
        emptyMessage={t("users.empty")}
      />

      <UserFormSheet
        open={inviteOpen}
        onOpenChange={onInviteOpenChange}
        mode="invite"
      />

      <UserFormSheet
        open={!!editUser}
        onOpenChange={(open) => {
          if (!open) setEditUser(null)
        }}
        mode="edit"
        user={editUser}
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

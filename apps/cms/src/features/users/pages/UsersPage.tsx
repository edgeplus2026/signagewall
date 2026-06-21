import { UserPlusIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { UsersTable } from "@/features/users/components/UsersTable"
import { useIsOrgAdmin } from "@/features/organizations/hooks/useIsOrgAdmin"
import { useUsers } from "@/features/users/hooks/useUsers"
import { cn } from "@/lib/utils"

export default function UsersPage() {
  const { t } = useTranslation()
  const isAdmin = useIsOrgAdmin()
  const { data: users = [] } = useUsers()
  const [inviteOpen, setInviteOpen] = useState(false)

  return (
    <div className="flex w-full min-w-0 flex-col gap-7 lg:px-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-primary text-xl font-medium tracking-tight">
              {t("users.title")}
            </h1>
            <span
              className={cn(
                "bg-success/10 text-success inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium",
              )}
            >
              {t("users.userCount", { count: users.length })}
            </span>
          </div>
          <p className="text-secondary text-sm">{t("users.description")}</p>
        </div>

        {isAdmin ? (
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              type="button"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => {
                setInviteOpen(true)
              }}
            >
              <UserPlusIcon data-icon="inline-start" />
              {t("users.invite.button")}
            </Button>
          </div>
        ) : null}
      </div>

      <UsersTable inviteOpen={inviteOpen} onInviteOpenChange={setInviteOpen} />
    </div>
  )
}

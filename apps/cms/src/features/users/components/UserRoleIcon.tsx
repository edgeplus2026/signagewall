import { useTranslation } from "react-i18next"

import { USER_ROLE_ICONS } from "@/features/users/lib/userRoleUi"
import type { UserRole } from "@/features/users/types/user.types"
import { cn } from "@/lib/utils"

interface UserRoleIconProps {
  role: UserRole
  className?: string
  iconClassName?: string
}

export function UserRoleIcon({
  role,
  className,
  iconClassName,
}: UserRoleIconProps) {
  const { t } = useTranslation()
  const Icon = USER_ROLE_ICONS[role]

  return (
    <span
      className={cn(
        "bg-sidebar text-secondary flex size-7 shrink-0 items-center justify-center rounded-md",
        className,
      )}
      aria-hidden
    >
      <Icon className={cn("size-3.5", iconClassName)} />
      <span className="sr-only">{t(`users.roles.${role}`)}</span>
    </span>
  )
}

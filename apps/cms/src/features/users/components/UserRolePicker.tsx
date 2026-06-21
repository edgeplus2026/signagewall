import { useTranslation } from "react-i18next"

import { USER_ROLE_ICONS } from "@/features/users/lib/userRoleUi"
import { USER_ROLES, type UserRole } from "@/features/users/types/user.types"
import { cn } from "@/lib/utils"

interface UserRolePickerProps {
  value: UserRole
  onValueChange: (value: UserRole) => void
  id?: string
  "aria-invalid"?: boolean
}

export function UserRolePicker({
  value,
  onValueChange,
  id,
  "aria-invalid": ariaInvalid,
}: UserRolePickerProps) {
  const { t } = useTranslation()

  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={t("users.columns.role")}
      aria-invalid={ariaInvalid}
      className="flex flex-col gap-2"
    >
      {USER_ROLES.map((role) => {
        const Icon = USER_ROLE_ICONS[role]
        const isSelected = value === role

        return (
          <button
            key={role}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => {
              onValueChange(role)
            }}
            className={cn(
              "group flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors",
              "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-tertiary/50",
              isSelected
                ? "border-brand/30 bg-brand/5 dark:border-brand/20 dark:bg-brand/10"
                : "border-secondary bg-panel hover:border-brand/50 hover:bg-highlight/30",
            )}
          >
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar text-secondary transition-colors",
                isSelected && "text-brand",
                !isSelected && "group-hover:text-brand",
              )}
            >
              <Icon className="size-4" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-sm font-medium text-primary">
                {t(`users.roles.${role}`)}
              </span>
              <span className="text-xs leading-normal text-secondary">
                {t(`users.roleDescriptions.${role}`)}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

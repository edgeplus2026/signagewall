import { EyeIcon, ShieldIcon, UserRoundIcon, type LucideIcon } from "lucide-react"

import type { UserRole } from "@/features/users/types/user.types"

export const USER_ROLE_ICONS: Record<UserRole, LucideIcon> = {
  admin: ShieldIcon,
  member: UserRoundIcon,
  viewer: EyeIcon,
}

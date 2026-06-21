import type { TFunction } from "i18next"
import { z } from "zod"

import { USER_ROLES } from "@/features/users/types/user.types"

export function createInviteUserSchema(t: TFunction) {
  return z.object({
    name: z.string().min(2, t("validation.nameMin", { min: 2 })),
    email: z.email(t("validation.emailInvalid")),
    role: z.enum(USER_ROLES),
  })
}

export function createUpdateUserSchema(t: TFunction) {
  return z.object({
    name: z.string().min(2, t("validation.nameMin", { min: 2 })),
    role: z.enum(USER_ROLES),
  })
}

export type InviteUserSchema = z.infer<ReturnType<typeof createInviteUserSchema>>
export type UpdateUserSchema = z.infer<ReturnType<typeof createUpdateUserSchema>>

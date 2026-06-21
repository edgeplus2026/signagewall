import type { TFunction } from "i18next"
import { z } from "zod"

export function createScreenSchema(t: TFunction) {
  return z.object({
    name: z
      .string()
      .min(1, t("screens.validation.nameRequired"))
      .max(200, t("screens.validation.nameMax", { max: 200 })),
    description: z
      .string()
      .max(2000, t("screens.validation.descriptionMax", { max: 2000 }))
      .optional(),
  })
}

export type ScreenSchema = z.infer<ReturnType<typeof createScreenSchema>>

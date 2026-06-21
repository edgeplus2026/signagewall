import type { TFunction } from "i18next"
import { z } from "zod"

export function createFolderSchema(t: TFunction) {
  return z.object({
    name: z
      .string()
      .min(1, t("media.validation.nameRequired"))
      .max(100, t("media.validation.nameMax", { max: 100 })),
  })
}

export type FolderSchema = z.infer<ReturnType<typeof createFolderSchema>>

export function createMediaDetailSchema(t: TFunction, mediaType: "image" | "video") {
  return z.object({
    name: z
      .string()
      .min(1, t("media.validation.nameRequired"))
      .max(255, t("media.validation.nameMax", { max: 255 })),
    ...(mediaType === "image"
      ? {
          defaultDuration: z
            .number()
            .int()
            .min(1, t("media.validation.durationMin", { min: 1 }))
            .max(3600, t("media.validation.durationMax", { max: 3600 })),
        }
      : {}),
  })
}

export type MediaDetailSchema = z.infer<
  ReturnType<typeof createMediaDetailSchema>
>

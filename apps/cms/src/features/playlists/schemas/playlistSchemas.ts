import type { TFunction } from "i18next"
import { z } from "zod"

export function createPlaylistSchema(t: TFunction) {
  return z.object({
    name: z
      .string()
      .min(1, t("playlists.validation.nameRequired"))
      .max(200, t("playlists.validation.nameMax", { max: 200 })),
    description: z
      .string()
      .max(2000, t("playlists.validation.descriptionMax", { max: 2000 }))
      .optional(),
  })
}

export type PlaylistSchema = z.infer<ReturnType<typeof createPlaylistSchema>>

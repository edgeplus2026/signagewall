import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { PlaylistScreensUsing } from "@/features/playlists/components/PlaylistScreensUsing"
import { useUpdatePlaylist } from "@/features/playlists/hooks/usePlaylists"
import {
  createPlaylistSchema,
  type PlaylistSchema,
} from "@/features/playlists/schemas/playlistSchemas"
import type { Playlist } from "@/features/playlists/types/playlist.types"
import {
  SettingsRow,
  SettingsSection,
} from "@/features/settings/components/SettingsSection"
import { getApiErrorMessage } from "@/lib/api-error"

const FORM_ID = "playlist-settings-form"

interface PlaylistSettingsTabProps {
  playlist: Playlist
}

export function PlaylistSettingsTab({ playlist }: PlaylistSettingsTabProps) {
  const { t } = useTranslation()
  const updatePlaylist = useUpdatePlaylist()
  const playlistSchema = useMemo(() => createPlaylistSchema(t), [t])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<PlaylistSchema>({
    resolver: zodResolver(playlistSchema),
    defaultValues: {
      name: playlist.name,
      description: playlist.description ?? "",
    },
  })

  useEffect(() => {
    reset({
      name: playlist.name,
      description: playlist.description ?? "",
    })
  }, [playlist, reset])

  const onSubmit = handleSubmit(async (data) => {
    try {
      await updatePlaylist.mutateAsync({
        id: playlist.id,
        payload: {
          name: data.name,
          description: data.description ?? "",
        },
      })
      toast.success(t("playlists.update.success"))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("playlists.update.error")))
    }
  })

  return (
    <div className="flex flex-col gap-7">
      <SettingsSection title={t("playlists.manage.tabs.settings")}>
        <form
          id={FORM_ID}
          className="contents"
          onSubmit={(event) => {
            void onSubmit(event)
          }}
        >
          <SettingsRow
            label={t("playlists.form.name")}
            field
            error={errors.name?.message}
          >
            <Input
              id="settings-playlist-name"
              autoComplete="off"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
          </SettingsRow>

          <Separator />

          <SettingsRow
            label={t("playlists.form.description")}
            field
            className="sm:items-start"
            error={errors.description?.message}
          >
            <Textarea
              id="settings-playlist-description"
              rows={3}
              aria-invalid={!!errors.description}
              {...register("description")}
            />
          </SettingsRow>

          <Separator />

          <div className="flex justify-end px-4 py-3">
            <Button
              type="submit"
              size="sm"
              disabled={!isDirty || isSubmitting || updatePlaylist.isPending}
            >
              {t("playlists.update.submit")}
            </Button>
          </div>
        </form>
      </SettingsSection>

      <PlaylistScreensUsing playlistId={playlist.id} />
    </div>
  )
}

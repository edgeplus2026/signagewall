import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import {
  useCreatePlaylist,
  useUpdatePlaylist,
} from "@/features/playlists/hooks/usePlaylists"
import {
  createPlaylistSchema,
  type PlaylistSchema,
} from "@/features/playlists/schemas/playlistSchemas"
import type { Playlist } from "@/features/playlists/types/playlist.types"
import { getApiErrorMessage } from "@/lib/api-error"

const CREATE_FORM_ID = "create-playlist-form"
const UPDATE_FORM_ID = "update-playlist-form"

type PlaylistFormMode = "create" | "edit"

interface PlaylistFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: PlaylistFormMode
  playlist?: Playlist | null
}

export function PlaylistFormSheet({
  open,
  onOpenChange,
  mode,
  playlist,
}: PlaylistFormSheetProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const createPlaylist = useCreatePlaylist()
  const updatePlaylist = useUpdatePlaylist()
  const playlistSchema = useMemo(() => createPlaylistSchema(t), [t])

  const formId = mode === "create" ? CREATE_FORM_ID : UPDATE_FORM_ID
  const isPending =
    mode === "create" ? createPlaylist.isPending : updatePlaylist.isPending

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PlaylistSchema>({
    resolver: zodResolver(playlistSchema),
    defaultValues: { name: "", description: "" },
  })

  useEffect(() => {
    if (open && mode === "edit" && playlist) {
      reset({
        name: playlist.name,
        description: playlist.description ?? "",
      })
    }
    if (open && mode === "create") {
      reset({ name: "", description: "" })
    }
    if (!open) reset()
  }, [open, mode, playlist, reset])

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (mode === "create") {
        const created = await createPlaylist.mutateAsync({
          name: data.name,
          ...(data.description ? { description: data.description } : {}),
        })
        toast.success(t("playlists.create.success"))
        reset()
        onOpenChange(false)
        void navigate(`/playlists/${created.id}`)
        return
      } else if (playlist) {
        await updatePlaylist.mutateAsync({
          id: playlist.id,
          payload: {
            name: data.name,
            description: data.description ?? "",
          },
        })
        toast.success(t("playlists.update.success"))
      }
      reset()
      onOpenChange(false)
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t(mode === "create" ? "playlists.create.error" : "playlists.update.error"),
        ),
      )
    }
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md" showCloseButton={false}>
        <SheetHeader>
          <SheetTitle>
            {t(mode === "create" ? "playlists.create.title" : "playlists.update.title")}
          </SheetTitle>
          <SheetDescription>
            {t(
              mode === "create"
                ? "playlists.create.description"
                : "playlists.update.description"
            )}
          </SheetDescription>
        </SheetHeader>

        <form
          id={formId}
          className="flex flex-1 flex-col overflow-y-auto px-4"
          onSubmit={(event) => {
            void onSubmit(event)
          }}
        >
          <FieldGroup>
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="playlist-name">
                {t("playlists.form.name")}
              </FieldLabel>
              <Input
                id="playlist-name"
                autoComplete="off"
                placeholder={t("playlists.form.namePlaceholder")}
                {...register("name")}
              />
              <FieldError errors={[errors.name]} />
            </Field>

            <Field data-invalid={!!errors.description}>
              <FieldLabel htmlFor="playlist-description">
                {t("playlists.form.description")}
              </FieldLabel>
              <Textarea
                id="playlist-description"
                rows={3}
                placeholder={t("playlists.form.descriptionPlaceholder")}
                {...register("description")}
              />
              <FieldError errors={[errors.description]} />
            </Field>
          </FieldGroup>
        </form>

        <SheetFooter className="flex-row justify-end gap-2 border-t border-secondary">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {t("playlists.form.cancel")}
          </Button>
          <Button type="submit" form={formId} disabled={isSubmitting || isPending}>
            {t(
              mode === "create"
                ? "playlists.create.submit"
                : "playlists.update.submit"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

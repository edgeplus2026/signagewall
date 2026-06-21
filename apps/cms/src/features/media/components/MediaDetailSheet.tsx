import { zodResolver } from "@hookform/resolvers/zod"
import { DownloadIcon, ImageIcon, ListPlusIcon, MonitorIcon, VideoIcon } from "lucide-react"
import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { z } from "zod"

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
import { useUpdateMedia } from "@/features/media/hooks/useMedia"
import {
  DEFAULT_MEDIA_DURATION,
  downloadMediaFile,
  formatDimensions,
  formatFileSize,
} from "@/features/media/lib/mediaUtils"
import {
  createMediaDetailSchema,
  type MediaDetailSchema,
} from "@/features/media/schemas/mediaSchemas"
import type { MediaItem } from "@/features/media/types/media.types"

const FORM_ID = "media-detail-form"

type MediaDetailFormValues = MediaDetailSchema | { name: string }

interface MediaDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: MediaItem | null
  onAddToPlaylist?: () => void
  onAddToScreen?: () => void
}

function MediaPreview({ item }: { item: MediaItem }) {
  const previewUrl = item.fileUrl ?? item.thumbnailUrl
  return (
    <div className="relative aspect-video w-full shrink-0 self-start overflow-hidden rounded-lg bg-sidebar">
      {item.type === "video" && previewUrl ? (
        <video
          src={previewUrl}
          controls
          className="absolute inset-0 size-full object-contain"
        />
      ) : previewUrl ? (
        <img
          src={previewUrl}
          alt=""
          className="absolute inset-0 size-full object-contain"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-sidebar via-panel to-sidebar">
          {item.type === "video" ? (
            <VideoIcon className="size-12 fill-secondary text-secondary opacity-100" strokeWidth={1.25} />
          ) : (
            <ImageIcon className="size-12 text-secondary" />
          )}
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-sm text-secondary">{label}</span>
      <span className="text-sm font-medium text-primary">{value}</span>
    </div>
  )
}

export function MediaDetailSheet({
  open,
  onOpenChange,
  item,
  onAddToPlaylist,
  onAddToScreen,
}: MediaDetailSheetProps) {
  const { t, i18n } = useTranslation()
  const updateMedia = useUpdateMedia()
  const isVideo = item?.type === "video"
  const detailSchema = useMemo(
    () =>
      item && item.type !== "folder"
        ? createMediaDetailSchema(t, item.type)
        : z.object({ name: z.string() }),
    [t, item],
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MediaDetailFormValues>({
    resolver: zodResolver(detailSchema),
    defaultValues: {
      name: "",
      defaultDuration: DEFAULT_MEDIA_DURATION,
    },
  })

  useEffect(() => {
    if (open && item && item.type !== "folder") {
      reset({
        name: item.name,
        ...(item.type === "image"
          ? { defaultDuration: item.defaultDuration ?? DEFAULT_MEDIA_DURATION }
          : {}),
      })
    }
    if (!open) reset()
  }, [open, item, reset])

  if (!item || item.type === "folder") return null

  const onSubmit = handleSubmit(async (data) => {
    try {
      const payload =
        item.type === "video"
          ? { name: data.name }
          : {
              name: data.name,
              ...("defaultDuration" in data &&
              typeof data.defaultDuration === "number"
                ? { defaultDuration: data.defaultDuration }
                : {}),
            }

      await updateMedia.mutateAsync({
        id: item.id,
        payload,
      })
      toast.success(t("media.detail.saveSuccess"))
      onOpenChange(false)
    } catch {
      toast.error(t("media.detail.saveError"))
    }
  })

  const handleDownload = async () => {
    const downloaded = await downloadMediaFile(item)
    if (!downloaded) {
      toast.error(t("media.detail.downloadError"))
    }
  }

  const uploadedDate = new Date(item.createdAt).toLocaleString(i18n.language, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  const videoDurationLabel =
    item.defaultDuration !== undefined
      ? String(item.defaultDuration)
      : t("media.detail.durationUnknown")

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg" showCloseButton={false}>
        <SheetHeader>
          <SheetTitle>{t("media.detail.title")}</SheetTitle>
          <SheetDescription>{t("media.detail.description")}</SheetDescription>
        </SheetHeader>

        <div className="visible-scrollbar flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-1">
          <div className="flex shrink-0 flex-col gap-3">
            <MediaPreview item={item} />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                void handleDownload()
              }}
            >
              <DownloadIcon data-icon="inline-start" />
              {t("media.detail.download")}
            </Button>
            {onAddToScreen || onAddToPlaylist ? (
              <div className="grid grid-cols-2 gap-2">
                {onAddToScreen ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onAddToScreen}
                  >
                    <MonitorIcon data-icon="inline-start" />
                    {t("media.detail.addToScreen")}
                  </Button>
                ) : null}
                {onAddToPlaylist ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onAddToPlaylist}
                  >
                    <ListPlusIcon data-icon="inline-start" />
                    {t("media.detail.addToPlaylist")}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>

          <form
            id={FORM_ID}
            className="flex flex-col gap-5"
            onSubmit={(event) => {
              void onSubmit(event)
            }}
          >
            <FieldGroup>
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="media-name">{t("media.detail.name")}</FieldLabel>
                <Input id="media-name" autoComplete="off" {...register("name")} />
                <FieldError errors={[errors.name]} />
              </Field>

              {isVideo ? (
                <Field>
                  <FieldLabel htmlFor="media-duration">
                    {t("media.detail.duration")}
                  </FieldLabel>
                  <Input
                    id="media-duration"
                    value={videoDurationLabel}
                    readOnly
                    disabled
                    className="opacity-60"
                  />
                  <p className="text-secondary text-xs">
                    {t("media.detail.videoDurationHint")}
                  </p>
                </Field>
              ) : (
                <Field data-invalid={"defaultDuration" in errors && !!errors.defaultDuration}>
                  <FieldLabel htmlFor="media-duration">
                    {t("media.detail.defaultDuration")}
                  </FieldLabel>
                  <Input
                    id="media-duration"
                    type="number"
                    min={1}
                    {...register("defaultDuration", { valueAsNumber: true })}
                  />
                  <FieldError
                    errors={
                      "defaultDuration" in errors ? [errors.defaultDuration] : []
                    }
                  />
                </Field>
              )}
            </FieldGroup>
          </form>

          <div className="divide-y divide-secondary border-t border-secondary">
            <DetailRow
              label={t("media.detail.type")}
              value={t(`media.types.${item.type}`)}
            />
            <DetailRow
              label={t("media.detail.size")}
              value={formatFileSize(item.size)}
            />
            <DetailRow
              label={t("media.detail.dimensions")}
              value={formatDimensions(item.width, item.height)}
            />
            <DetailRow
              label={t("media.detail.uploadedAt")}
              value={uploadedDate}
            />
          </div>
        </div>

        <SheetFooter className="flex-row justify-end gap-2 border-t border-secondary">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {t("media.form.cancel")}
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            disabled={isSubmitting || updateMedia.isPending}
          >
            {t("media.detail.save")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
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
import { useUpdateMedia } from "@/features/media/hooks/useMedia"
import {
  createFolderSchema,
  type FolderSchema,
} from "@/features/media/schemas/mediaSchemas"
import type { MediaItem } from "@/features/media/types/media.types"

const FORM_ID = "rename-folder-form"

interface RenameFolderSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  folder: MediaItem | null
}

export function RenameFolderSheet({
  open,
  onOpenChange,
  folder,
}: RenameFolderSheetProps) {
  const { t } = useTranslation()
  const updateMedia = useUpdateMedia()
  const folderSchema = useMemo(() => createFolderSchema(t), [t])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FolderSchema>({
    resolver: zodResolver(folderSchema),
    defaultValues: { name: "" },
  })

  useEffect(() => {
    if (open && folder) {
      reset({ name: folder.name })
    }
    if (!open) {
      reset({ name: "" })
    }
  }, [folder, open, reset])

  const onSubmit = handleSubmit(async (data) => {
    if (!folder) return

    try {
      await updateMedia.mutateAsync({
        id: folder.id,
        payload: { name: data.name },
      })
      toast.success(t("media.folder.rename.success"))
      reset()
      onOpenChange(false)
    } catch {
      toast.error(t("media.folder.rename.error"))
    }
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md" showCloseButton={false}>
        <SheetHeader>
          <SheetTitle>{t("media.folder.rename.title")}</SheetTitle>
          <SheetDescription>{t("media.folder.rename.description")}</SheetDescription>
        </SheetHeader>
        <form
          id={FORM_ID}
          className="flex flex-1 flex-col overflow-y-auto px-4"
          onSubmit={(event) => {
            void onSubmit(event)
          }}
        >
          <FieldGroup>
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="rename-folder-name">
                {t("media.folder.name")}
              </FieldLabel>
              <Input
                id="rename-folder-name"
                autoComplete="off"
                placeholder={t("media.folder.namePlaceholder")}
                {...register("name")}
              />
              <FieldError errors={[errors.name]} />
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
            {t("media.form.cancel")}
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            disabled={isSubmitting || updateMedia.isPending}
          >
            {t("media.folder.rename.submit")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

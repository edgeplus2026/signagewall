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

const FORM_ID = "rename-media-form"

interface RenameMediaSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: MediaItem | null
}

export function RenameMediaSheet({
  open,
  onOpenChange,
  item,
}: RenameMediaSheetProps) {
  const { t } = useTranslation()
  const updateMedia = useUpdateMedia()
  const nameSchema = useMemo(() => createFolderSchema(t), [t])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FolderSchema>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: "" },
  })

  useEffect(() => {
    if (open && item) {
      reset({ name: item.name })
    }
    if (!open) {
      reset({ name: "" })
    }
  }, [item, open, reset])

  const onSubmit = handleSubmit(async (data) => {
    if (!item) return

    try {
      await updateMedia.mutateAsync({
        id: item.id,
        payload: { name: data.name },
      })
      toast.success(t("media.rename.success"))
      reset()
      onOpenChange(false)
    } catch {
      toast.error(t("media.rename.error"))
    }
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md" showCloseButton={false}>
        <SheetHeader>
          <SheetTitle>{t("media.rename.title")}</SheetTitle>
          <SheetDescription>{t("media.rename.description")}</SheetDescription>
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
              <FieldLabel htmlFor="rename-media-name">{t("media.detail.name")}</FieldLabel>
              <Input
                id="rename-media-name"
                autoComplete="off"
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
            {t("media.rename.submit")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

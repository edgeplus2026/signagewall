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
import { useCreateFolder } from "@/features/media/hooks/useMedia"
import {
  createFolderSchema,
  type FolderSchema,
} from "@/features/media/schemas/mediaSchemas"

const FORM_ID = "create-folder-form"

interface CreateFolderSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  parentId: string | null
}

export function CreateFolderSheet({
  open,
  onOpenChange,
  parentId,
}: CreateFolderSheetProps) {
  const { t } = useTranslation()
  const createFolder = useCreateFolder()
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
    if (!open) reset()
  }, [open, reset])

  const onSubmit = handleSubmit(async (data) => {
    try {
      await createFolder.mutateAsync({ name: data.name, parentId })
      toast.success(t("media.folder.create.success"))
      reset()
      onOpenChange(false)
    } catch {
      toast.error(t("media.folder.create.error"))
    }
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md" showCloseButton={false}>
        <SheetHeader>
          <SheetTitle>{t("media.folder.create.title")}</SheetTitle>
          <SheetDescription>
            {t("media.folder.create.description")}
          </SheetDescription>
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
              <FieldLabel htmlFor="folder-name">
                {t("media.folder.name")}
              </FieldLabel>
              <Input
                id="folder-name"
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
            disabled={isSubmitting || createFolder.isPending}
          >
            {t("media.folder.create.submit")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

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
import { getPlanLimitDetails } from "@/features/plans/lib/planLimit"
import { usePlanDialogStore } from "@/features/plans/store/planDialogStore"
import { useCreateScreen } from "@/features/screens/hooks/useScreens"
import {
  createScreenSchema,
  type ScreenSchema,
} from "@/features/screens/schemas/screenSchemas"
import { getApiErrorMessage } from "@/lib/api-error"

const CREATE_FORM_ID = "create-screen-form"

interface ScreenFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ScreenFormSheet({ open, onOpenChange }: ScreenFormSheetProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const createScreen = useCreateScreen()
  const openPlanDialog = usePlanDialogStore((state) => state.openDialog)
  const screenSchema = useMemo(() => createScreenSchema(t), [t])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ScreenSchema>({
    resolver: zodResolver(screenSchema),
    defaultValues: { name: "", description: "" },
  })

  useEffect(() => {
    if (open) {
      reset({ name: "", description: "" })
    }
    if (!open) reset()
  }, [open, reset])

  const onSubmit = handleSubmit(async (data) => {
    try {
      const created = await createScreen.mutateAsync({
        name: data.name,
        ...(data.description ? { description: data.description } : {}),
      })
      toast.success(t("screens.create.success"))
      reset()
      onOpenChange(false)
      void navigate(`/screens/${created.id}`)
    } catch (error) {
      // Out of licences is a sales moment, not a form error: swap the sheet for
      // the upgrade dialog instead of toasting something they cannot act on.
      if (getPlanLimitDetails(error)) {
        onOpenChange(false)
        openPlanDialog("screens")
        return
      }
      toast.error(getApiErrorMessage(error, t("screens.create.error")))
    }
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md" showCloseButton={false}>
        <SheetHeader>
          <SheetTitle>{t("screens.create.title")}</SheetTitle>
          <SheetDescription>{t("screens.create.description")}</SheetDescription>
        </SheetHeader>

        <form
          id={CREATE_FORM_ID}
          className="flex flex-1 flex-col overflow-y-auto px-4"
          onSubmit={(event) => {
            void onSubmit(event)
          }}
        >
          <FieldGroup>
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="screen-name">{t("screens.form.name")}</FieldLabel>
              <Input
                id="screen-name"
                autoComplete="off"
                placeholder={t("screens.form.namePlaceholder")}
                {...register("name")}
              />
              <FieldError errors={[errors.name]} />
            </Field>

            <Field data-invalid={!!errors.description}>
              <FieldLabel htmlFor="screen-description">
                {t("screens.form.description")}
              </FieldLabel>
              <Textarea
                id="screen-description"
                rows={3}
                placeholder={t("screens.form.descriptionPlaceholder")}
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
            {t("screens.form.cancel")}
          </Button>
          <Button
            type="submit"
            form={CREATE_FORM_ID}
            disabled={isSubmitting || createScreen.isPending}
          >
            {t("screens.create.submit")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

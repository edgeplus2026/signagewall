import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { useUpdateScreen } from "@/features/screens/hooks/useScreens"
import {
  createScreenSchema,
  type ScreenSchema,
} from "@/features/screens/schemas/screenSchemas"
import type { Screen } from "@/features/screens/types/screen.types"
import {
  SettingsRow,
  SettingsSection,
} from "@/features/settings/components/SettingsSection"
import { getApiErrorMessage } from "@/lib/api-error"

const FORM_ID = "screen-settings-form"

interface ScreenSettingsTabProps {
  screen: Screen
}

export function ScreenSettingsTab({ screen }: ScreenSettingsTabProps) {
  const { t } = useTranslation()
  const updateScreen = useUpdateScreen()
  const screenSchema = useMemo(() => createScreenSchema(t), [t])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ScreenSchema>({
    resolver: zodResolver(screenSchema),
    defaultValues: {
      name: screen.name,
      description: screen.description ?? "",
    },
  })

  useEffect(() => {
    reset({
      name: screen.name,
      description: screen.description ?? "",
    })
  }, [screen, reset])

  const onSubmit = handleSubmit(async (data) => {
    try {
      await updateScreen.mutateAsync({
        id: screen.id,
        payload: {
          name: data.name,
          description: data.description ?? "",
        },
      })
      toast.success(t("screens.update.success"))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("screens.update.error")))
    }
  })

  return (
    <div className="flex flex-col gap-7">
      <SettingsSection title={t("screens.manage.tabs.settings")}>
        <form
          id={FORM_ID}
          className="contents"
          onSubmit={(event) => {
            void onSubmit(event)
          }}
        >
          <SettingsRow
            label={t("screens.form.name")}
            field
            error={errors.name?.message}
          >
            <Input
              id="settings-screen-name"
              autoComplete="off"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
          </SettingsRow>

          <Separator />

          <SettingsRow
            label={t("screens.form.description")}
            field
            className="items-start"
            error={errors.description?.message}
          >
            <Textarea
              id="settings-screen-description"
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
              disabled={!isDirty || isSubmitting || updateScreen.isPending}
            >
              {t("screens.update.submit")}
            </Button>
          </div>
        </form>
      </SettingsSection>
    </div>
  )
}

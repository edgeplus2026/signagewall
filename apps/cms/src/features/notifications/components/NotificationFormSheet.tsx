import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RichTextEditor } from '@/features/notifications/components/RichTextEditor'
import {
  useCreateNotification,
  useUpdateNotification,
} from '@/features/notifications/hooks/useAdminNotifications'
import { emptyTiptapDoc } from '@/features/notifications/lib/tiptapExtensions'
import { tiptapToPlainText } from '@/features/notifications/lib/tiptapText'
import {
  createNotificationFormSchema,
  type NotificationFormValues,
} from '@/features/notifications/schemas/notificationSchemas'
import type {
  AdminNotification,
  CreateNotificationRequest,
} from '@/features/notifications/types/notification.types'
import { getApiErrorMessage } from '@/lib/api-error'

const FORM_ID = 'notification-form'

type NotificationFormMode = 'create' | 'edit'

interface NotificationFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: NotificationFormMode
  notification?: AdminNotification | null
}

/** Converts an ISO timestamp to a `datetime-local` input value in local time. */
function toDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) {
    return ''
  }
  const date = new Date(iso)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function buildDefaults(
  notification?: AdminNotification | null,
): NotificationFormValues {
  return {
    titleEn: notification?.translations.en.title ?? '',
    contentEn: notification?.translations.en.content ?? emptyTiptapDoc,
    titleSr: notification?.translations.sr.title ?? '',
    contentSr: notification?.translations.sr.content ?? emptyTiptapDoc,
    expiresAt: toDateTimeLocal(notification?.expiresAt),
  }
}

export function NotificationFormSheet({
  open,
  onOpenChange,
  mode,
  notification,
}: NotificationFormSheetProps) {
  const { t } = useTranslation()
  const schema = useMemo(() => createNotificationFormSchema(t), [t])
  const createMutation = useCreateNotification()
  const updateMutation = useUpdateNotification()

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NotificationFormValues>({
    resolver: zodResolver(schema),
    defaultValues: buildDefaults(notification),
  })

  useEffect(() => {
    if (open) {
      reset(buildDefaults(notification))
    }
  }, [open, notification, reset])

  const isCreate = mode === 'create'

  const onSubmit = handleSubmit(async (data) => {
    const hasSerbian =
      data.titleSr.trim().length > 0 || tiptapToPlainText(data.contentSr).length > 0

    const payload: CreateNotificationRequest = {
      translations: {
        en: { title: data.titleEn.trim(), content: data.contentEn },
        ...(hasSerbian
          ? { sr: { title: data.titleSr.trim(), content: data.contentSr } }
          : {}),
      },
      ...(data.expiresAt
        ? { expiresAt: new Date(data.expiresAt).toISOString() }
        : {}),
    }

    try {
      if (isCreate) {
        await createMutation.mutateAsync(payload)
        toast.success(t('notifications.form.createSuccess'))
      } else if (notification) {
        await updateMutation.mutateAsync({ id: notification.id, payload })
        toast.success(t('notifications.form.updateSuccess'))
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('notifications.form.error')))
    }
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg" showCloseButton={false}>
        <SheetHeader>
          <SheetTitle>
            {isCreate
              ? t('notifications.form.createTitle')
              : t('notifications.form.editTitle')}
          </SheetTitle>
          <SheetDescription>
            {t('notifications.form.description')}
          </SheetDescription>
        </SheetHeader>

        <form
          id={FORM_ID}
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-4"
          onSubmit={(event) => {
            void onSubmit(event)
          }}
        >
          <Tabs defaultValue="en" className="gap-4">
            <TabsList variant="line" className="w-fit">
              <TabsTrigger value="en">
                {t('notifications.form.languageEn')}
              </TabsTrigger>
              <TabsTrigger value="sr">
                {t('notifications.form.languageSr')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="en">
              <FieldGroup>
                <Field data-invalid={!!errors.titleEn}>
                  <FieldLabel htmlFor="notification-title-en">
                    {t('notifications.form.title')}
                  </FieldLabel>
                  <Input id="notification-title-en" {...register('titleEn')} />
                  <FieldError errors={[errors.titleEn]} />
                </Field>
                <Field data-invalid={!!errors.contentEn}>
                  <FieldLabel htmlFor="notification-content-en">
                    {t('notifications.form.content')}
                  </FieldLabel>
                  <Controller
                    control={control}
                    name="contentEn"
                    render={({ field }) => (
                      <RichTextEditor
                        id="notification-content-en"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <FieldError errors={[errors.contentEn]} />
                </Field>
              </FieldGroup>
            </TabsContent>

            <TabsContent value="sr">
              <FieldGroup>
                <Field data-invalid={!!errors.titleSr}>
                  <FieldLabel htmlFor="notification-title-sr">
                    {t('notifications.form.title')}
                  </FieldLabel>
                  <Input id="notification-title-sr" {...register('titleSr')} />
                  <FieldError errors={[errors.titleSr]} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="notification-content-sr">
                    {t('notifications.form.content')}
                  </FieldLabel>
                  <Controller
                    control={control}
                    name="contentSr"
                    render={({ field }) => (
                      <RichTextEditor
                        id="notification-content-sr"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </Field>
              </FieldGroup>
            </TabsContent>
          </Tabs>

          <Field>
            <FieldLabel htmlFor="notification-expires-at">
              {t('notifications.form.expiresAt')}
            </FieldLabel>
            <Input
              id="notification-expires-at"
              type="datetime-local"
              {...register('expiresAt')}
            />
          </Field>
        </form>

        <SheetFooter className="flex-row justify-end gap-2 border-t border-secondary">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {t('notifications.form.cancel')}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={isSubmitting}>
            {isCreate
              ? t('notifications.form.createSubmit')
              : t('notifications.form.updateSubmit')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

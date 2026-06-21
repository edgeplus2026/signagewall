import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { settingsApi } from '@/features/settings/api/settingsApi'
import { getApiErrorMessage } from '@/lib/api-error'
import { RatingInput } from '@/features/settings/components/RatingInput'
import {
  createFeedbackSchema,
  type FeedbackSchema,
} from '@/features/settings/schemas/settingsSchemas'

const FORM_ID = 'feedback-form'

interface FeedbackSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FeedbackSheet({ open, onOpenChange }: FeedbackSheetProps) {
  const { t } = useTranslation()
  const feedbackSchema = useMemo(() => createFeedbackSchema(t), [t])

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FeedbackSchema>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { rating: 0, message: '' },
  })

  useEffect(() => {
    if (!open) reset({ rating: 5, message: '' })
  }, [open, reset])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) reset({ rating: 0, message: '' })
    onOpenChange(nextOpen)
  }

  const onSubmit = handleSubmit(async (data) => {
    try {
      await settingsApi.submitFeedback(data)
      toast.success(t('settings.feedback.success'))
      reset({ rating: 0, message: '' })
      onOpenChange(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('settings.feedback.error')))
    }
  })

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-md" showCloseButton={false}>
        <SheetHeader>
          <SheetTitle>{t('settings.feedback.title')}</SheetTitle>
          <SheetDescription>{t('settings.feedback.description')}</SheetDescription>
        </SheetHeader>
        <form
          id={FORM_ID}
          className="flex flex-1 flex-col overflow-y-auto px-4"
          onSubmit={(event) => {
            void onSubmit(event)
          }}
        >
          <FieldGroup>
            <Field data-invalid={!!errors.rating}>
              <FieldLabel htmlFor="feedback-rating">{t('settings.feedback.rating')}</FieldLabel>
              <Controller
                name="rating"
                control={control}
                render={({ field }) => (
                  <RatingInput
                    id="feedback-rating"
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              <FieldError errors={[errors.rating]} />
            </Field>
            <Field data-invalid={!!errors.message}>
              <FieldLabel htmlFor="feedback-message">
                {t('settings.feedback.message')}
              </FieldLabel>
              <Textarea
                id="feedback-message"
                placeholder={t('settings.feedback.messagePlaceholder')}
                {...register('message')}
              />
              <FieldError errors={[errors.message]} />
            </Field>
          </FieldGroup>
        </form>
        <SheetFooter className="flex-row justify-end gap-2 border-t border-secondary">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              handleOpenChange(false)
            }}
          >
            {t('settings.feedback.cancel')}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={isSubmitting}>
            {t('settings.feedback.submit')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

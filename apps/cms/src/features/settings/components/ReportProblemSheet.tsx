import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
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
import {
  createReportProblemSchema,
  type ReportProblemSchema,
} from '@/features/settings/schemas/settingsSchemas'

const FORM_ID = 'report-problem-form'

interface ReportProblemSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReportProblemSheet({ open, onOpenChange }: ReportProblemSheetProps) {
  const { t } = useTranslation()
  const reportProblemSchema = useMemo(() => createReportProblemSchema(t), [t])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReportProblemSchema>({
    resolver: zodResolver(reportProblemSchema),
    defaultValues: { message: '' },
  })

  useEffect(() => {
    if (!open) reset({ message: '' })
  }, [open, reset])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) reset({ message: '' })
    onOpenChange(nextOpen)
  }

  const onSubmit = handleSubmit(async (data) => {
    try {
      await settingsApi.reportProblem(data)
      toast.success(t('settings.support.reportProblem.success'))
      reset({ message: '' })
      onOpenChange(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('settings.support.reportProblem.error')))
    }
  })

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-md" showCloseButton={false}>
        <SheetHeader>
          <SheetTitle>{t('settings.support.reportProblem.title')}</SheetTitle>
          <SheetDescription>
            {t('settings.support.reportProblem.description')}
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
            <Field data-invalid={!!errors.message}>
              <FieldLabel htmlFor="report-problem-message">
                {t('settings.support.reportProblem.message')}
              </FieldLabel>
              <Textarea
                id="report-problem-message"
                placeholder={t('settings.support.reportProblem.messagePlaceholder')}
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
            {t('settings.support.reportProblem.cancel')}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={isSubmitting}>
            {t('settings.support.reportProblem.submit')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

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
import {
  useCreateCategory,
  useUpdateCategory,
} from '@/features/apps/hooks/useAdminCategories'
import type { AppCategory } from '@/features/apps/types/app.types'
import { getApiErrorMessage } from '@/lib/api-error'

const FORM_ID = 'category-editor-form'

const editorSchema = z.object({
  name: z.string().min(1).max(80),
})

type EditorValues = z.infer<typeof editorSchema>

interface CategoryEditorSheetProps {
  /** The category to edit, or null to create a new one. */
  category: AppCategory | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CategoryEditorSheet({
  category,
  open,
  onOpenChange,
}: CategoryEditorSheetProps) {
  const { t } = useTranslation()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const isEdit = Boolean(category)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditorValues>({
    resolver: zodResolver(editorSchema),
    values: { name: category?.name ?? '' },
  })

  const isPending = createCategory.isPending || updateCategory.isPending

  const onSubmit = handleSubmit((data) => {
    const onError = (error: unknown) => {
      toast.error(getApiErrorMessage(error, t('apps.categories.editor.error')))
    }

    if (isEdit && category) {
      updateCategory.mutate(
        { id: category.id, payload: { name: data.name } },
        {
          onSuccess: () => {
            toast.success(t('apps.categories.editor.updated'))
            onOpenChange(false)
          },
          onError,
        },
      )
    } else {
      createCategory.mutate(
        { name: data.name },
        {
          onSuccess: () => {
            toast.success(t('apps.categories.editor.created'))
            // Keep the sheet open so several categories can be added in a row.
            reset({ name: '' })
          },
          onError,
        },
      )
    }
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg" showCloseButton={false}>
        <SheetHeader>
          <SheetTitle>
            {isEdit
              ? t('apps.categories.editor.editTitle')
              : t('apps.categories.editor.createTitle')}
          </SheetTitle>
          <SheetDescription>{t('apps.categories.editor.description')}</SheetDescription>
        </SheetHeader>

        <form
          id={FORM_ID}
          className="flex flex-1 flex-col overflow-y-auto px-4 pb-4"
          onSubmit={(event) => {
            void onSubmit(event)
          }}
        >
          <FieldGroup>
            <Field data-invalid={Boolean(errors.name)}>
              <FieldLabel htmlFor="category-name">
                {t('apps.categories.name')}
              </FieldLabel>
              <Input id="category-name" {...register('name')} />
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
            {t('common.cancel')}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={isPending}>
            {isEdit
              ? t('apps.categories.editor.save')
              : t('apps.categories.editor.create')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

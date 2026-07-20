import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import {
  useAvailableManifests,
  useCreateApp,
  useUpdateApp,
} from '@/features/apps/hooks/useAdminApps'
import { appCategorySlugs, categoryName } from '@/features/apps/lib/appCopy'
import type { AdminApp } from '@/features/apps/types/app.types'
import { getApiErrorMessage } from '@/lib/api-error'

const FORM_ID = 'app-editor-form'

const editorSchema = z.object({
  slug: z.string().min(1).max(80),
  name: z.string().min(1).max(120),
  isPublic: z.boolean(),
})

type EditorValues = z.infer<typeof editorSchema>

interface AppEditorSheetProps {
  /** The app to edit, or null to create a new one. */
  app: AdminApp | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AppEditorSheet({ app, open, onOpenChange }: AppEditorSheetProps) {
  const { t } = useTranslation()
  const createApp = useCreateApp()
  const updateApp = useUpdateApp()
  const isEdit = Boolean(app)

  // Code apps that can still be added (only relevant when creating).
  const { data: manifests = [] } = useAvailableManifests()
  const addable = manifests.filter((manifest) => !manifest.alreadyInCatalog)

  const defaults: EditorValues = {
    slug: app?.slug ?? '',
    name: app?.name ?? '',
    isPublic: app?.isPublic ?? true,
  }

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<EditorValues>({
    resolver: zodResolver(editorSchema),
    // Re-seed when a different app opens (Sheet content stays mounted otherwise).
    values: defaults,
  })

  // Picking a code app fills the slug + prefills the display name.
  const handleSelectManifest = (slug: string) => {
    const manifest = addable.find((entry) => entry.slug === slug)
    if (!manifest) return
    setValue('slug', manifest.slug, { shouldValidate: true })
    setValue('name', manifest.name, { shouldValidate: true })
  }

  const isPending = createApp.isPending || updateApp.isPending

  // Category membership is code-defined; shown read-only for context.
  const categorySlugs = app ? appCategorySlugs(app.slug) : []

  const onSubmit = handleSubmit((data) => {
    const payload = {
      name: data.name,
      isPublic: data.isPublic,
    }

    const onError = (error: unknown) => {
      toast.error(getApiErrorMessage(error, t('apps.admin.editor.error')))
    }

    if (isEdit && app) {
      updateApp.mutate(
        { id: app.id, payload },
        {
          onSuccess: () => {
            toast.success(t('apps.admin.editor.updated'))
            onOpenChange(false)
          },
          onError,
        },
      )
    } else {
      createApp.mutate(
        { slug: data.slug, ...payload },
        {
          onSuccess: () => {
            toast.success(t('apps.admin.editor.created'))
            onOpenChange(false)
          },
          onError,
        },
      )
    }
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
        showCloseButton={false}
        aria-describedby={undefined}
      >
        <SheetHeader>
          <SheetTitle>
            {isEdit ? t('apps.admin.editor.editTitle') : t('apps.admin.editor.createTitle')}
          </SheetTitle>
        </SheetHeader>

        <form
          id={FORM_ID}
          className="flex flex-1 flex-col overflow-y-auto px-4 pb-4"
          onSubmit={(event) => {
            void onSubmit(event)
          }}
        >
          <FieldGroup>
            {!isEdit ? (
              <Field data-invalid={Boolean(errors.slug)}>
                <FieldLabel htmlFor="app-pick">{t('apps.admin.editor.app')}</FieldLabel>
                <Controller
                  name="slug"
                  control={control}
                  render={({ field }) => (
                    <Combobox
                      id="app-pick"
                      value={field.value}
                      onChange={handleSelectManifest}
                      options={addable.map((manifest) => ({
                        label: manifest.name,
                        value: manifest.slug,
                      }))}
                      placeholder={t('apps.admin.editor.appPlaceholder')}
                      searchPlaceholder={t('apps.admin.editor.appSearchPlaceholder')}
                      emptyLabel={t('apps.admin.editor.noAvailable')}
                      aria-invalid={Boolean(errors.slug)}
                    />
                  )}
                />
                <FieldError errors={[errors.slug]} />
              </Field>
            ) : null}

            <Field data-invalid={Boolean(errors.name)}>
              <FieldLabel htmlFor="app-name">{t('apps.admin.editor.name')}</FieldLabel>
              <Input id="app-name" {...register('name')} />
              <FieldError errors={[errors.name]} />
            </Field>

            <Controller
              name="isPublic"
              control={control}
              render={({ field }) => (
                <Field orientation="horizontal">
                  <Switch
                    id="app-public"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <FieldLabel htmlFor="app-public">
                    {t('apps.admin.editor.isPublic')}
                  </FieldLabel>
                </Field>
              )}
            />

            {isEdit ? (
              <Field>
                <FieldLabel>{t('apps.admin.editor.categories')}</FieldLabel>
                {categorySlugs.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {categorySlugs.map((slug) => (
                      <span
                        key={slug}
                        className="inline-flex rounded-md bg-quaternary px-2 py-0.5 text-xs text-secondary"
                      >
                        {categoryName(t, slug)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-secondary">
                    {t('apps.categories.uncategorized')}
                  </p>
                )}
              </Field>
            ) : null}
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
            {isEdit ? t('apps.admin.editor.save') : t('apps.admin.editor.create')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

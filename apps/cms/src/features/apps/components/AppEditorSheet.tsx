import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Combobox } from '@/components/ui/combobox'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { AppIcon } from '@/features/apps/components/AppIcon'
import {
  useAvailableManifests,
  useCreateApp,
  useUpdateApp,
} from '@/features/apps/hooks/useAdminApps'
import { useAdminCategories } from '@/features/apps/hooks/useAdminCategories'
import { resolveAppColor } from '@/features/apps/lib/appColor'
import type { AdminApp } from '@/features/apps/types/app.types'
import { getApiErrorMessage } from '@/lib/api-error'

const FORM_ID = 'app-editor-form'

const editorSchema = z.object({
  slug: z.string().min(1).max(80),
  name: z.string().min(1).max(120),
  tagline: z.string().min(1).max(280),
  description: z.string().min(1).max(2000),
  about: z.string().max(8000).optional(),
  iconSvg: z.string().max(20000).optional(),
  color: z.string().max(32).optional(),
  isPublic: z.boolean(),
  categoryIds: z.array(z.string()),
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

  const { data: categories = [] } = useAdminCategories()

  const defaults: EditorValues = {
    slug: app?.slug ?? '',
    name: app?.name ?? '',
    tagline: app?.tagline ?? '',
    description: app?.description ?? '',
    about: app?.about ?? '',
    iconSvg: app?.iconSvg ?? '',
    color: app?.color ?? '',
    isPublic: app?.isPublic ?? true,
    categoryIds: app?.categoryIds ?? [],
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

  // Live preview of the icon tile as the SVG / colour change.
  const iconSvg = useWatch({ control, name: 'iconSvg' })
  const color = useWatch({ control, name: 'color' })

  // Picking an app fills the slug + prefills the editable presentation fields.
  const handleSelectManifest = (slug: string) => {
    const manifest = addable.find((entry) => entry.slug === slug)
    if (!manifest) return
    setValue('slug', manifest.slug, { shouldValidate: true })
    setValue('name', manifest.name, { shouldValidate: true })
    setValue('tagline', manifest.tagline, { shouldValidate: true })
    setValue('description', manifest.description, { shouldValidate: true })
  }

  const isPending = createApp.isPending || updateApp.isPending

  const onSubmit = handleSubmit((data) => {
    const payload = {
      name: data.name,
      tagline: data.tagline,
      description: data.description,
      about: data.about,
      iconSvg: data.iconSvg,
      color: data.color,
      isPublic: data.isPublic,
      categoryIds: data.categoryIds,
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
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg" showCloseButton={false}>
        <SheetHeader>
          <SheetTitle>
            {isEdit ? t('apps.admin.editor.editTitle') : t('apps.admin.editor.createTitle')}
          </SheetTitle>
          <SheetDescription>{t('apps.admin.editor.description')}</SheetDescription>
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

            {/* Icon + colour with a live preview tile. */}
            <Field data-invalid={Boolean(errors.iconSvg)}>
              <FieldLabel htmlFor="app-icon">{t('apps.admin.editor.icon')}</FieldLabel>
              <div className="flex items-start gap-3">
                <AppIcon iconSvg={iconSvg} color={color} className="size-14 rounded-xl shadow-sm" />
                <Textarea
                  id="app-icon"
                  rows={3}
                  className="max-h-36 flex-1 overflow-y-auto font-mono text-xs"
                  placeholder={t('apps.admin.editor.iconPlaceholder')}
                  {...register('iconSvg')}
                />
              </div>
              <FieldError errors={[errors.iconSvg]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="app-color">{t('apps.admin.editor.color')}</FieldLabel>
              <Controller
                name="color"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      aria-label={t('apps.admin.editor.color')}
                      value={resolveAppColor(field.value)}
                      onChange={(event) => {
                        field.onChange(event.target.value)
                      }}
                      className="size-9 shrink-0 cursor-pointer rounded-md border border-quaternary bg-panel p-1"
                    />
                    <Input
                      id="app-color"
                      value={field.value ?? ''}
                      placeholder="#FF0000"
                      onChange={(event) => {
                        field.onChange(event.target.value)
                      }}
                      className="font-mono"
                    />
                  </div>
                )}
              />
            </Field>

            <Field data-invalid={Boolean(errors.name)}>
              <FieldLabel htmlFor="app-name">{t('apps.admin.editor.name')}</FieldLabel>
              <Input id="app-name" {...register('name')} />
              <FieldError errors={[errors.name]} />
            </Field>

            <Field data-invalid={Boolean(errors.tagline)}>
              <FieldLabel htmlFor="app-tagline">{t('apps.admin.editor.tagline')}</FieldLabel>
              <Input id="app-tagline" {...register('tagline')} />
              <FieldError errors={[errors.tagline]} />
            </Field>

            <Field data-invalid={Boolean(errors.description)}>
              <FieldLabel htmlFor="app-description">
                {t('apps.admin.editor.description')}
              </FieldLabel>
              <Textarea id="app-description" rows={2} {...register('description')} />
              <FieldError errors={[errors.description]} />
            </Field>

            <Field data-invalid={Boolean(errors.about)}>
              <FieldLabel htmlFor="app-about">{t('apps.admin.editor.about')}</FieldLabel>
              <Textarea id="app-about" rows={4} {...register('about')} />
              <FieldError errors={[errors.about]} />
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

            <Controller
              name="categoryIds"
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>{t('apps.admin.editor.categories')}</FieldLabel>
                  {categories.length === 0 ? (
                    <p className="text-xs text-secondary">
                      {t('apps.admin.editor.noCategories')}
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {categories.map((category) => {
                        const checked = field.value.includes(category.id)
                        return (
                          <label
                            key={category.id}
                            className="flex items-center gap-2 text-sm text-primary"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) => {
                                field.onChange(
                                  value === true
                                    ? [...field.value, category.id]
                                    : field.value.filter((id) => id !== category.id),
                                )
                              }}
                            />
                            {category.name}
                          </label>
                        )
                      })}
                    </div>
                  )}
                </Field>
              )}
            />
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

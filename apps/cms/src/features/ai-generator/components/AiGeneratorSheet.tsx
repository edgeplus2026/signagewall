import {
  GOALS,
  INDUSTRIES,
  LANGUAGES,
  TONES,
  type AiSlide,
  type ContentGoal,
  type ContentLanguage,
  type ContentTone,
  type Industry,
} from '@edge/apps-contract'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ChevronRightIcon,
  Loader2Icon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import {
  useAiGeneration,
  useAiGenerations,
  useCreateAiGeneration,
  useCreatePlaylistFromGeneration,
  useDeleteAiGeneration,
} from '@/features/ai-generator/hooks'
import {
  createAiGeneratorSchema,
  type AiGeneratorFormValues,
} from '@/features/ai-generator/schemas/aiGeneratorSchemas'
import { useAiGeneratorStore } from '@/features/ai-generator/store/aiGeneratorStore'
import type {
  AiGenerationStatus,
  CreateAiGenerationRequest,
} from '@/features/ai-generator/types/aiGenerator.types'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'

/** The wizard's form steps (the result phase is driven by the job status). */
const STEP_FIELDS: (keyof AiGeneratorFormValues)[][] = [
  ['businessName', 'industry'],
  ['targetAudience', 'primaryGoal'],
  ['tone', 'language', 'keyPoints'],
]
const REVIEW_STEP = STEP_FIELDS.length
const TOTAL_STEPS = STEP_FIELDS.length + 1
const STEP_TITLE_KEYS = ['business', 'audience', 'voice', 'review'] as const

type TFunc = ReturnType<typeof useTranslation>['t']

/**
 * App-wide AI generator drawer. Driven by {@link useAiGeneratorStore} so it can
 * be opened from a page button or a completion toast, and survive being closed.
 * The body is a separate component rendered inside `SheetContent`, which Radix
 * unmounts on close — that remount-on-open resets transient form state.
 */
export function AiGeneratorSheet() {
  const open = useAiGeneratorStore((state) => state.open)
  const close = useAiGeneratorStore((state) => state.close)

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) close()
      }}
    >
      <SheetContent className="sm:max-w-lg" showCloseButton={false}>
        <AiGeneratorContent />
      </SheetContent>
    </Sheet>
  )
}

function AiGeneratorContent() {
  const view = useAiGeneratorStore((state) => state.view)
  const activeGenerationId = useAiGeneratorStore(
    (state) => state.activeGenerationId,
  )

  if (view === 'detail' && activeGenerationId) {
    return <GenerationDetail generationId={activeGenerationId} />
  }
  if (view === 'form') {
    return <WizardForm />
  }
  return <HistoryList />
}

// --- History (the record of what was entered) --------------------------------

function HistoryList() {
  const { t } = useTranslation()
  const showForm = useAiGeneratorStore((state) => state.showForm)
  const setActiveGeneration = useAiGeneratorStore(
    (state) => state.setActiveGeneration,
  )
  const close = useAiGeneratorStore((state) => state.close)
  const { data: generations = [], isLoading } = useAiGenerations()
  const deleteGeneration = useDeleteAiGeneration()

  const handleDelete = (id: string) => {
    deleteGeneration.mutate(id, {
      onSuccess: () => {
        toast.success(t('aiGenerator.history.deleteSuccess'))
      },
      onError: (error) => {
        toast.error(
          getApiErrorMessage(error, t('aiGenerator.history.deleteError')),
        )
      },
    })
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <SparklesIcon data-icon="inline-start" />
          {t('aiGenerator.title')}
        </SheetTitle>
        <SheetDescription>
          {t('aiGenerator.history.description')}
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col overflow-y-auto px-4">
        <Button
          type="button"
          className="w-full"
          onClick={() => {
            showForm()
          }}
        >
          <PlusIcon data-icon="inline-start" />
          {t('aiGenerator.history.new')}
        </Button>

        <div className="mt-4 flex flex-col gap-2">
          {isLoading ? (
            <p className="text-secondary py-8 text-center text-sm">
              {t('common.loading')}
            </p>
          ) : generations.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-primary text-sm font-medium">
                {t('aiGenerator.history.empty')}
              </p>
              <p className="text-secondary mt-1 text-sm">
                {t('aiGenerator.history.emptyDescription')}
              </p>
            </div>
          ) : (
            generations.map((gen) => (
              <div
                key={gen.id}
                className="border-secondary hover:bg-highlight flex items-center rounded-lg border transition-colors"
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveGeneration(gen.id)
                  }}
                  className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-primary truncate text-sm font-medium">
                      {gen.input.businessName?.trim()
                        ? gen.input.businessName
                        : t(`aiGenerator.industries.${gen.input.industry}`)}
                    </span>
                    <span className="text-secondary truncate text-xs">
                      {t(`aiGenerator.industries.${gen.input.industry}`)} ·{' '}
                      {formatDate(gen.createdAt)}
                    </span>
                  </div>
                  <StatusBadge status={gen.status} t={t} />
                  <ChevronRightIcon className="text-secondary size-4 shrink-0" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleDelete(gen.id)
                  }}
                  disabled={deleteGeneration.isPending}
                  aria-label={t('aiGenerator.history.delete')}
                  title={t('aiGenerator.history.delete')}
                  className="text-secondary hover:text-danger shrink-0 self-stretch px-3 disabled:opacity-50"
                >
                  <Trash2Icon className="size-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <SheetFooter className="flex-row justify-end gap-2 border-t border-secondary">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            close()
          }}
        >
          {t('aiGenerator.cancel')}
        </Button>
      </SheetFooter>
    </>
  )
}

function StatusBadge({
  status,
  t,
}: {
  status: AiGenerationStatus
  t: TFunc
}) {
  const cls: Record<AiGenerationStatus, string> = {
    queued: 'bg-secondary/15 text-secondary',
    processing: 'bg-brand/15 text-brand',
    succeeded: 'bg-success/10 text-success',
    failed: 'bg-danger/10 text-danger',
  }
  return (
    <span
      className={cn(
        'shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium',
        cls[status],
      )}
    >
      {t(`aiGenerator.status.${status}`)}
    </span>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// --- The multi-step form -----------------------------------------------------

function WizardForm() {
  const { t, i18n } = useTranslation()
  const schema = useMemo(() => createAiGeneratorSchema(t), [t])
  const defaultLanguage: ContentLanguage = i18n.language.startsWith('sr')
    ? 'sr'
    : 'en'

  const [step, setStep] = useState(0)
  const createGeneration = useCreateAiGeneration()
  const setActiveGeneration = useAiGeneratorStore(
    (state) => state.setActiveGeneration,
  )
  const showList = useAiGeneratorStore((state) => state.showList)

  const {
    control,
    register,
    handleSubmit,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<AiGeneratorFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      industry: '',
      businessName: '',
      targetAudience: '',
      primaryGoal: '',
      tone: '',
      language: defaultLanguage,
      keyPoints: '',
    },
  })

  const industryOptions = useMemo(
    () =>
      INDUSTRIES.map((v) => ({ value: v, label: t(`aiGenerator.industries.${v}`) })),
    [t],
  )
  const goalOptions = useMemo(
    () => GOALS.map((v) => ({ value: v, label: t(`aiGenerator.goals.${v}`) })),
    [t],
  )
  const toneOptions = useMemo(
    () => TONES.map((v) => ({ value: v, label: t(`aiGenerator.tones.${v}`) })),
    [t],
  )
  const languageOptions = useMemo(
    () =>
      LANGUAGES.map((v) => ({ value: v, label: t(`aiGenerator.languages.${v}`) })),
    [t],
  )

  const handleNext = async () => {
    const valid = await trigger(STEP_FIELDS[step])
    if (valid) {
      setStep((current) => current + 1)
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    const keyPoints = (values.keyPoints ?? '')
      .split('\n')
      .map((point) => point.trim())
      .filter(Boolean)
      .slice(0, 10)

    const payload: CreateAiGenerationRequest = {
      industry: values.industry as Industry,
      primaryGoal: values.primaryGoal as ContentGoal,
      tone: values.tone as ContentTone,
      language: values.language as ContentLanguage,
      ...(values.businessName?.trim()
        ? { businessName: values.businessName.trim() }
        : {}),
      ...(values.targetAudience?.trim()
        ? { targetAudience: values.targetAudience.trim() }
        : {}),
      ...(keyPoints.length > 0 ? { keyPoints } : {}),
    }

    try {
      const created = await createGeneration.mutateAsync(payload)
      setActiveGeneration(created.id)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('aiGenerator.toast.generateError')))
    }
  })

  const values = getValues()

  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <SparklesIcon data-icon="inline-start" />
          {t('aiGenerator.title')}
        </SheetTitle>
        <SheetDescription>{t('aiGenerator.description')}</SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col overflow-y-auto px-4">
        <FormSteps
          step={step}
          control={control}
          register={register}
          errors={errors}
          values={values}
          t={t}
          industryOptions={industryOptions}
          goalOptions={goalOptions}
          toneOptions={toneOptions}
          languageOptions={languageOptions}
        />
      </div>

      <SheetFooter className="flex-row justify-end gap-2 border-t border-secondary">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (step === 0) {
              showList()
            } else {
              setStep((current) => current - 1)
            }
          }}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          {t('aiGenerator.back')}
        </Button>
        {step < REVIEW_STEP ? (
          <Button
            type="button"
            onClick={() => {
              void handleNext()
            }}
          >
            {t('aiGenerator.next')}
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => {
              void onSubmit()
            }}
            disabled={createGeneration.isPending}
          >
            <SparklesIcon data-icon="inline-start" />
            {t('aiGenerator.generate')}
          </Button>
        )}
      </SheetFooter>
    </>
  )
}

// --- A single generation: progress / failure / result -----------------------

function GenerationDetail({ generationId }: { generationId: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const playlistNameRef = useRef<HTMLInputElement>(null)
  const { data: job } = useAiGeneration(generationId)
  const createPlaylist = useCreatePlaylistFromGeneration()
  const showList = useAiGeneratorStore((state) => state.showList)
  const showForm = useAiGeneratorStore((state) => state.showForm)
  const close = useAiGeneratorStore((state) => state.close)

  const status = job?.status
  const isGenerating =
    !job || status === 'queued' || status === 'processing'

  const handleCreatePlaylist = async () => {
    const trimmedName = playlistNameRef.current?.value.trim() ?? ''
    try {
      const { playlistId } = await createPlaylist.mutateAsync(
        trimmedName
          ? { id: generationId, name: trimmedName }
          : { id: generationId },
      )
      toast.success(t('aiGenerator.toast.createSuccess'))
      close()
      void navigate(`/playlists/${playlistId}`)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('aiGenerator.toast.createError')))
    }
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <SparklesIcon data-icon="inline-start" />
          {t('aiGenerator.title')}
        </SheetTitle>
        <SheetDescription>
          {isGenerating
            ? t('aiGenerator.generating.description')
            : status === 'failed'
              ? t('aiGenerator.failed.description')
              : t('aiGenerator.result.description')}
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col overflow-y-auto px-4">
        {isGenerating ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
            <Loader2Icon className="size-8 animate-spin text-secondary" />
            <p className="text-sm font-medium text-primary">
              {t('aiGenerator.generating.title')}
            </p>
            <p className="text-secondary max-w-xs text-sm">
              {t('aiGenerator.generating.description')}
            </p>
          </div>
        ) : status === 'failed' ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
            <AlertCircleIcon className="text-danger size-8" />
            <p className="text-sm font-medium text-primary">
              {t('aiGenerator.failed.title')}
            </p>
            <p className="text-secondary max-w-xs text-sm">
              {t('aiGenerator.failed.description')}
            </p>
          </div>
        ) : (
          <GeneratedSlides
            slides={job.result?.slides ?? []}
            defaultName={job.result?.suggestedName ?? ''}
            nameRef={playlistNameRef}
            t={t}
          />
        )}
      </div>

      <SheetFooter className="flex-row justify-end gap-2 border-t border-secondary">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            showList()
          }}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          {t('aiGenerator.detail.back')}
        </Button>
        {status === 'succeeded' && (
          <Button
            type="button"
            onClick={() => {
              void handleCreatePlaylist()
            }}
            disabled={createPlaylist.isPending}
          >
            {t('aiGenerator.result.create')}
          </Button>
        )}
        {status === 'failed' && (
          <Button
            type="button"
            onClick={() => {
              showForm()
            }}
          >
            {t('aiGenerator.failed.retry')}
          </Button>
        )}
      </SheetFooter>
    </>
  )
}

interface Option {
  value: string
  label: string
}

interface FormStepsProps {
  step: number
  control: ReturnType<typeof useForm<AiGeneratorFormValues>>['control']
  register: ReturnType<typeof useForm<AiGeneratorFormValues>>['register']
  errors: ReturnType<
    typeof useForm<AiGeneratorFormValues>
  >['formState']['errors']
  values: AiGeneratorFormValues
  t: TFunc
  industryOptions: Option[]
  goalOptions: Option[]
  toneOptions: Option[]
  languageOptions: Option[]
}

function FormSteps({
  step,
  control,
  register,
  errors,
  values,
  t,
  industryOptions,
  goalOptions,
  toneOptions,
  languageOptions,
}: FormStepsProps) {
  const stepKey = STEP_TITLE_KEYS[step] ?? 'review'

  return (
    <div className="flex flex-col gap-5 py-1">
      <p className="text-secondary text-xs font-medium tracking-wide uppercase">
        {t('aiGenerator.stepCount', { current: step + 1, total: TOTAL_STEPS })} ·{' '}
        {t(`aiGenerator.steps.${stepKey}`)}
      </p>

      {step === 0 && (
        <FieldGroup>
          <Field data-invalid={!!errors.businessName}>
            <FieldLabel htmlFor="ai-business-name">
              {t('aiGenerator.fields.businessName')}
            </FieldLabel>
            <Input
              id="ai-business-name"
              autoComplete="off"
              placeholder={t('aiGenerator.fields.businessNamePlaceholder')}
              {...register('businessName')}
            />
            <FieldError errors={[errors.businessName]} />
          </Field>

          <SelectField
            name="industry"
            control={control}
            label={t('aiGenerator.fields.industry')}
            placeholder={t('aiGenerator.fields.industryPlaceholder')}
            options={industryOptions}
            invalid={!!errors.industry}
            error={errors.industry?.message}
          />
        </FieldGroup>
      )}

      {step === 1 && (
        <FieldGroup>
          <Field data-invalid={!!errors.targetAudience}>
            <FieldLabel htmlFor="ai-audience">
              {t('aiGenerator.fields.targetAudience')}
            </FieldLabel>
            <Input
              id="ai-audience"
              autoComplete="off"
              placeholder={t('aiGenerator.fields.targetAudiencePlaceholder')}
              {...register('targetAudience')}
            />
            <FieldError errors={[errors.targetAudience]} />
          </Field>

          <SelectField
            name="primaryGoal"
            control={control}
            label={t('aiGenerator.fields.primaryGoal')}
            placeholder={t('aiGenerator.fields.primaryGoalPlaceholder')}
            options={goalOptions}
            invalid={!!errors.primaryGoal}
            error={errors.primaryGoal?.message}
          />
        </FieldGroup>
      )}

      {step === 2 && (
        <FieldGroup>
          <SelectField
            name="tone"
            control={control}
            label={t('aiGenerator.fields.tone')}
            placeholder={t('aiGenerator.fields.tonePlaceholder')}
            options={toneOptions}
            invalid={!!errors.tone}
            error={errors.tone?.message}
          />

          <SelectField
            name="language"
            control={control}
            label={t('aiGenerator.fields.language')}
            placeholder={t('aiGenerator.fields.languagePlaceholder')}
            options={languageOptions}
            invalid={!!errors.language}
            error={errors.language?.message}
          />

          <Field data-invalid={!!errors.keyPoints}>
            <FieldLabel htmlFor="ai-key-points">
              {t('aiGenerator.fields.keyPoints')}
            </FieldLabel>
            <Textarea
              id="ai-key-points"
              rows={4}
              placeholder={t('aiGenerator.fields.keyPointsPlaceholder')}
              {...register('keyPoints')}
            />
            <FieldDescription>
              {t('aiGenerator.fields.keyPointsHelp')}
            </FieldDescription>
            <FieldError errors={[errors.keyPoints]} />
          </Field>
        </FieldGroup>
      )}

      {step === REVIEW_STEP && (
        <dl className="flex flex-col gap-3 text-sm">
          <ReviewRow
            label={t('aiGenerator.fields.industry')}
            value={
              values.industry
                ? t(`aiGenerator.industries.${values.industry}`)
                : t('aiGenerator.review.notProvided')
            }
          />
          <ReviewRow
            label={t('aiGenerator.fields.businessName')}
            value={
              values.businessName?.trim()
                ? values.businessName
                : t('aiGenerator.review.notProvided')
            }
          />
          <ReviewRow
            label={t('aiGenerator.fields.targetAudience')}
            value={
              values.targetAudience?.trim()
                ? values.targetAudience
                : t('aiGenerator.review.notProvided')
            }
          />
          <ReviewRow
            label={t('aiGenerator.fields.primaryGoal')}
            value={
              values.primaryGoal
                ? t(`aiGenerator.goals.${values.primaryGoal}`)
                : t('aiGenerator.review.notProvided')
            }
          />
          <ReviewRow
            label={t('aiGenerator.fields.tone')}
            value={
              values.tone
                ? t(`aiGenerator.tones.${values.tone}`)
                : t('aiGenerator.review.notProvided')
            }
          />
          <ReviewRow
            label={t('aiGenerator.fields.language')}
            value={
              values.language
                ? t(`aiGenerator.languages.${values.language}`)
                : t('aiGenerator.review.notProvided')
            }
          />
          <ReviewRow
            label={t('aiGenerator.fields.keyPoints')}
            value={
              values.keyPoints?.trim()
                ? values.keyPoints
                : t('aiGenerator.review.notProvided')
            }
          />
        </dl>
      )}
    </div>
  )
}

interface SelectFieldProps {
  name: 'industry' | 'primaryGoal' | 'tone' | 'language'
  control: FormStepsProps['control']
  label: string
  placeholder: string
  options: Option[]
  invalid: boolean
  error: string | undefined
}

function SelectField({
  name,
  control,
  label,
  placeholder,
  options,
  invalid,
  error,
}: SelectFieldProps) {
  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={`ai-${name}`}>{label}</FieldLabel>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger
              id={`ai-${name}`}
              className="w-full"
              aria-invalid={invalid}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      <FieldError>{error}</FieldError>
    </Field>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-secondary/60 pb-2 last:border-0">
      <dt className="text-secondary text-xs">{label}</dt>
      <dd className="text-primary">{value}</dd>
    </div>
  )
}

interface GeneratedSlidesProps {
  slides: AiSlide[]
  defaultName: string
  nameRef: React.RefObject<HTMLInputElement | null>
  t: TFunc
}

function GeneratedSlides({
  slides,
  defaultName,
  nameRef,
  t,
}: GeneratedSlidesProps) {
  return (
    <div className="flex flex-col gap-4 py-1">
      <Field>
        <FieldLabel htmlFor="ai-playlist-name">
          {t('aiGenerator.result.playlistName')}
        </FieldLabel>
        <Input
          id="ai-playlist-name"
          ref={nameRef}
          autoComplete="off"
          placeholder={t('aiGenerator.result.playlistNamePlaceholder')}
          defaultValue={defaultName}
        />
      </Field>

      <div className="flex flex-col gap-3">
        {slides.map((slide, index) => (
          <div
            key={index}
            className="border-secondary overflow-hidden rounded-lg border"
          >
            {/* 16:9 preview mimicking the on-screen slide: photo + overlaid text. */}
            <div
              className={cn(
                'relative flex aspect-video flex-col items-center justify-center gap-1 p-4 text-center',
                !slide.imageUrl && 'bg-panel',
              )}
              style={
                slide.imageUrl
                  ? {
                      backgroundImage: `url("${slide.imageUrl}")`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }
                  : undefined
              }
            >
              {slide.imageUrl && (
                <div
                  className={cn(
                    'absolute inset-0',
                    slide.layout === 'photo' ? 'bg-black/25' : 'bg-black/50',
                  )}
                />
              )}
              <div className="relative flex flex-col gap-1">
                {slide.title && (
                  <span
                    className={cn(
                      'text-sm font-semibold',
                      slide.imageUrl ? 'text-white' : 'text-primary',
                    )}
                  >
                    {slide.title}
                  </span>
                )}
                {slide.body && (
                  <p
                    className={cn(
                      'text-sm whitespace-pre-wrap',
                      slide.imageUrl ? 'text-white/90' : 'text-primary',
                    )}
                  >
                    {slide.body}
                  </p>
                )}
              </div>
            </div>
            <div className="bg-panel text-secondary px-3 py-1.5 text-xs">
              {t('aiGenerator.result.slide', { number: index + 1 })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

import { CalendarRange, Clock, Power, TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { TimezoneCombobox } from '@/components/ui/timezone-combobox'
import { useUpdateScreenAvailability } from '@/features/screens/hooks/useScreens'
import type {
  ScreenAvailability,
  ScreenAvailabilityMode,
  SpecialAvailabilityWindow,
  WeekdayKey,
  WeeklyDayHours,
} from '@/features/screens/types/screen.types'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'

function getDefaultTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

function getTimezoneOptions(): string[] {
  try {
    return Intl.supportedValuesOf('timeZone')
  } catch {
    return [getDefaultTimezone(), 'UTC']
  }
}

const WEEKDAYS: WeekdayKey[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

const DEFAULT_START = '09:00'
const DEFAULT_END = '17:00'

function createDefaultAvailability(): ScreenAvailability {
  const today = new Date().toISOString().slice(0, 10)
  return {
    mode: 'always',
    timezone: getDefaultTimezone(),
    weekly: WEEKDAYS.map((day) => ({
      day,
      enabled: day !== 'saturday' && day !== 'sunday',
      start: DEFAULT_START,
      end: DEFAULT_END,
    })),
    special: {
      startDate: today,
      endDate: today,
      start: DEFAULT_START,
      end: DEFAULT_END,
    },
  }
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':')
  return Number(h) * 60 + Number(m)
}

/** Mirrors the backend semantic rules so errors surface inline before saving. */
interface AvailabilityErrors {
  /** Weekday keys whose enabled window has start >= end. */
  weeklyDays: Set<WeekdayKey>
  specialDateRange: boolean // startDate > endDate
  specialTimeRange: boolean // start >= end
}

function validateAvailability(a: ScreenAvailability): AvailabilityErrors {
  const weeklyDays = new Set<WeekdayKey>()
  for (const entry of a.weekly) {
    if (entry.enabled && toMinutes(entry.start) >= toMinutes(entry.end)) {
      weeklyDays.add(entry.day)
    }
  }
  return {
    weeklyDays,
    specialDateRange: a.special.endDate < a.special.startDate,
    specialTimeRange: toMinutes(a.special.start) >= toMinutes(a.special.end),
  }
}

function hasErrorsForMode(errors: AvailabilityErrors, mode: ScreenAvailabilityMode): boolean {
  if (mode === 'weekly') return errors.weeklyDays.size > 0
  if (mode === 'special') return errors.specialDateRange || errors.specialTimeRange
  return false
}

interface ModeOption {
  mode: ScreenAvailabilityMode
  icon: ComponentType<{ className?: string }>
}

const MODE_OPTIONS: ModeOption[] = [
  { mode: 'always', icon: Power },
  { mode: 'weekly', icon: Clock },
  { mode: 'special', icon: CalendarRange },
]

interface ScreenAvailabilityTabProps {
  screenId: string
  availability?: ScreenAvailability | undefined
  isLoading?: boolean | undefined
}

export function ScreenAvailabilityTab({
  screenId,
  availability: savedFromServer,
  isLoading = false,
}: ScreenAvailabilityTabProps) {
  const { t } = useTranslation()
  const updateAvailability = useUpdateScreenAvailability()
  const timezoneOptions = useMemo(() => getTimezoneOptions(), [])

  const initial = useMemo(() => savedFromServer ?? createDefaultAvailability(), [savedFromServer])
  const [savedAvailability, setSavedAvailability] = useState<ScreenAvailability>(initial)
  const [availability, setAvailability] = useState<ScreenAvailability>(initial)

  // `savedRef` mirrors the last persisted baseline so the resync effect can read
  // it without a stale closure or re-running on every save.
  const savedRef = useRef(savedAvailability)

  // Re-seed the form when the server's saved availability changes (background
  // refetch, concurrent edit) — but only if the user has no pending edits, so we
  // never discard in-progress changes.
  useEffect(() => {
    setAvailability((current) =>
      JSON.stringify(current) === JSON.stringify(savedRef.current) ? initial : current,
    )
    savedRef.current = initial
    setSavedAvailability(initial)
  }, [initial])

  const commitSaved = (next: ScreenAvailability) => {
    savedRef.current = next
    setSavedAvailability(next)
  }

  const isDirty = useMemo(
    () => JSON.stringify(availability) !== JSON.stringify(savedAvailability),
    [availability, savedAvailability],
  )

  const errors = useMemo(() => validateAvailability(availability), [availability])
  const hasErrors = hasErrorsForMode(errors, availability.mode)

  if (isLoading) {
    return <Skeleton className="min-h-96 w-full rounded-xl" />
  }

  const setMode = (mode: ScreenAvailabilityMode) => {
    setAvailability((prev) => ({ ...prev, mode }))
  }

  const setTimezone = (timezone: string) => {
    setAvailability((prev) => ({ ...prev, timezone }))
  }

  const updateDay = (day: WeekdayKey, patch: Partial<WeeklyDayHours>) => {
    setAvailability((prev) => ({
      ...prev,
      weekly: prev.weekly.map((entry) => (entry.day === day ? { ...entry, ...patch } : entry)),
    }))
  }

  const updateSpecial = (patch: Partial<SpecialAvailabilityWindow>) => {
    setAvailability((prev) => ({
      ...prev,
      special: { ...prev.special, ...patch },
    }))
  }

  const handleSave = () => {
    updateAvailability.mutate(
      { id: screenId, payload: availability },
      {
        onSuccess: () => {
          commitSaved(availability)
          toast.success(t('screens.availability.saveSuccess'))
        },
        onError: (error) => {
          toast.error(getApiErrorMessage(error, t('screens.availability.saveError')))
        },
      },
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-panel flex flex-col overflow-hidden rounded-xl md:flex-row">
        {/* Left rail: mode options */}
        <nav className="border-quaternary flex shrink-0 flex-col gap-1 border-b p-2 md:w-64 md:border-r md:border-b-0">
          {MODE_OPTIONS.map(({ mode, icon: Icon }) => {
            const selected = availability.mode === mode
            return (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setMode(mode)
                }}
                aria-pressed={selected}
                className={cn(
                  'flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                  selected ? 'bg-highlight' : 'hover:bg-highlight/60',
                )}
              >
                <Icon
                  className={cn(
                    'text-primary mt-0.5 size-4 shrink-0',
                    selected ? 'text-primary' : 'text-secondary',
                  )}
                />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-primary text-sm font-medium">
                    {t(`screens.availability.modes.${mode}.label`)}
                  </span>
                  <span className="text-secondary text-[13px] leading-snug">
                    {t(`screens.availability.modes.${mode}.description`)}
                  </span>
                </span>
              </button>
            )
          })}
        </nav>

        {/* Right panel: active mode content */}
        <div className="min-w-0 flex-1 p-5">
          {availability.mode === 'always' ? <AlwaysOnPanel /> : null}
          {availability.mode === 'weekly' ? (
            <WeeklyPanel
              weekly={availability.weekly}
              timezone={availability.timezone}
              timezoneOptions={timezoneOptions}
              errorDays={errors.weeklyDays}
              onUpdateDay={updateDay}
              onTimezoneChange={setTimezone}
            />
          ) : null}
          {availability.mode === 'special' ? (
            <SpecialPanel
              special={availability.special}
              timezone={availability.timezone}
              timezoneOptions={timezoneOptions}
              dateRangeError={errors.specialDateRange}
              timeRangeError={errors.specialTimeRange}
              onUpdate={updateSpecial}
              onTimezoneChange={setTimezone}
            />
          ) : null}
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          disabled={!isDirty || hasErrors || updateAvailability.isPending}
          onClick={handleSave}
        >
          {t('screens.availability.save')}
        </Button>
      </div>
    </div>
  )
}

function PanelHeader({ mode }: { mode: ScreenAvailabilityMode }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-primary text-sm font-medium">
        {t(`screens.availability.modes.${mode}.label`)}
      </h3>
      <p className="text-secondary text-[13px] leading-snug">
        {t(`screens.availability.modes.${mode}.activeHint`)}
      </p>
    </div>
  )
}

function WarningBanner() {
  const { t } = useTranslation()
  return (
    <div
      role="alert"
      className="bg-warning/10 text-warning ring-warning/20 flex items-start gap-2.5 rounded-lg px-3.5 py-3 ring-1"
    >
      <TriangleAlert className="mt-px size-4 shrink-0" />
      <p className="text-[13px] leading-snug">{t('screens.availability.warning')}</p>
    </div>
  )
}

interface TimezoneFieldProps {
  timezone: string
  options: string[]
  onChange: (timezone: string) => void
}

function TimezoneField({ timezone, options, onChange }: TimezoneFieldProps) {
  const { t } = useTranslation()
  return (
    <PanelField
      label={t('screens.availability.timezone.label')}
      hint={t('screens.availability.timezone.hint')}
    >
      <TimezoneCombobox
        value={timezone}
        options={options}
        onChange={onChange}
        aria-label={t('screens.availability.timezone.label')}
        searchPlaceholder={t('screens.availability.timezone.search')}
        emptyLabel={t('screens.availability.timezone.empty')}
        className="w-60"
      />
    </PanelField>
  )
}

function AlwaysOnPanel() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <div className="bg-highlight text-secondary flex size-11 items-center justify-center rounded-full">
        <Power className="size-5" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-primary text-sm font-medium">
          {t('screens.availability.modes.always.label')}
        </p>
        <p className="text-secondary max-w-xs text-[13px] leading-snug">
          {t('screens.availability.modes.always.description')}
        </p>
      </div>
    </div>
  )
}

interface WeeklyPanelProps {
  weekly: WeeklyDayHours[]
  timezone: string
  timezoneOptions: string[]
  errorDays: Set<WeekdayKey>
  onUpdateDay: (day: WeekdayKey, patch: Partial<WeeklyDayHours>) => void
  onTimezoneChange: (timezone: string) => void
}

function WeeklyPanel({
  weekly,
  timezone,
  timezoneOptions,
  errorDays,
  onUpdateDay,
  onTimezoneChange,
}: WeeklyPanelProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-5">
      <PanelHeader mode="weekly" />
      <WarningBanner />
      <div className="divide-quaternary flex flex-col divide-y">
        <TimezoneField timezone={timezone} options={timezoneOptions} onChange={onTimezoneChange} />
        {weekly.map((entry) => {
          const invalid = errorDays.has(entry.day)
          return (
            <div key={entry.day} className="flex flex-col gap-1 py-2.5 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <label className="flex min-w-0 items-center gap-3">
                  <Switch
                    checked={entry.enabled}
                    onCheckedChange={(enabled) => {
                      onUpdateDay(entry.day, { enabled })
                    }}
                  />
                  <span
                    className={cn(
                      'truncate text-sm font-medium',
                      entry.enabled ? 'text-primary' : 'text-secondary',
                    )}
                  >
                    {t(`screens.availability.weekday.${entry.day}`)}
                  </span>
                </label>

                {entry.enabled ? (
                  <TimeRange
                    start={entry.start}
                    end={entry.end}
                    invalid={invalid}
                    onStart={(value) => {
                      onUpdateDay(entry.day, { start: value })
                    }}
                    onEnd={(value) => {
                      onUpdateDay(entry.day, { end: value })
                    }}
                  />
                ) : (
                  <span className="text-secondary ml-auto text-[13px]">
                    {t('screens.availability.weekly.off')}
                  </span>
                )}
              </div>
              {invalid ? (
                <p className="text-danger ml-13 text-[13px] leading-snug">
                  {t('screens.availability.errors.timeRange')}
                </p>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface SpecialPanelProps {
  special: SpecialAvailabilityWindow
  timezone: string
  timezoneOptions: string[]
  dateRangeError: boolean
  timeRangeError: boolean
  onUpdate: (patch: Partial<SpecialAvailabilityWindow>) => void
  onTimezoneChange: (timezone: string) => void
}

function SpecialPanel({
  special,
  timezone,
  timezoneOptions,
  dateRangeError,
  timeRangeError,
  onUpdate,
  onTimezoneChange,
}: SpecialPanelProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-5">
      <PanelHeader mode="special" />
      <WarningBanner />
      <div className="divide-quaternary flex flex-col divide-y">
        <TimezoneField timezone={timezone} options={timezoneOptions} onChange={onTimezoneChange} />
        <PanelField
          label={t('screens.availability.special.dateRange')}
          hint={t('screens.availability.special.dateRangeHint')}
          error={dateRangeError ? t('screens.availability.errors.dateRange') : undefined}
        >
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Input
              type="date"
              aria-label={t('screens.availability.special.startDate')}
              aria-invalid={dateRangeError}
              value={special.startDate}
              max={special.endDate || undefined}
              onChange={(event) => {
                onUpdate({ startDate: event.target.value })
              }}
              className="w-40"
            />
            <span className="text-secondary">–</span>
            <Input
              type="date"
              aria-label={t('screens.availability.special.endDate')}
              aria-invalid={dateRangeError}
              value={special.endDate}
              min={special.startDate || undefined}
              onChange={(event) => {
                onUpdate({ endDate: event.target.value })
              }}
              className="w-40"
            />
          </div>
        </PanelField>

        <PanelField
          label={t('screens.availability.special.hours')}
          hint={t('screens.availability.special.hoursHint')}
          error={timeRangeError ? t('screens.availability.errors.timeRange') : undefined}
        >
          <TimeRange
            start={special.start}
            end={special.end}
            invalid={timeRangeError}
            onStart={(value) => {
              onUpdate({ start: value })
            }}
            onEnd={(value) => {
              onUpdate({ end: value })
            }}
          />
        </PanelField>
      </div>
    </div>
  )
}

interface TimeRangeProps {
  start: string
  end: string
  invalid?: boolean
  onStart: (value: string) => void
  onEnd: (value: string) => void
}

function TimeRange({ start, end, invalid = false, onStart, onEnd }: TimeRangeProps) {
  const { t } = useTranslation()
  return (
    <div className="ml-auto flex shrink-0 items-center gap-2">
      <Input
        type="time"
        aria-label={t('screens.availability.startTime')}
        aria-invalid={invalid}
        value={start}
        onChange={(event) => {
          onStart(event.target.value)
        }}
        className="w-30"
      />
      <span className="text-secondary">–</span>
      <Input
        type="time"
        aria-label={t('screens.availability.endTime')}
        aria-invalid={invalid}
        value={end}
        onChange={(event) => {
          onEnd(event.target.value)
        }}
        className="w-30"
      />
    </div>
  )
}

function PanelField({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint: string
  error?: string | undefined
  children: ReactNode
}) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <div className="min-w-40 flex-1">
          <p className="text-primary text-sm font-medium">{label}</p>
          <p className="text-secondary mt-0.5 text-[13px] leading-snug">{hint}</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">{children}</div>
      </div>
      {error ? <p className="text-danger mt-1.5 text-[13px] leading-snug">{error}</p> : null}
    </div>
  )
}

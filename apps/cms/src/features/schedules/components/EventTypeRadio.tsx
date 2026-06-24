import { MonitorPlay, PowerOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { ScheduleEventType } from '@/features/schedules/types/schedule.types'
import { cn } from '@/lib/utils'

const OPTIONS: { type: ScheduleEventType; labelKey: string; icon: typeof MonitorPlay }[] = [
  { type: 'content', labelKey: 'schedules.event.type.content', icon: MonitorPlay },
  { type: 'screen_off', labelKey: 'schedules.event.type.screenOff', icon: PowerOff },
]

interface EventTypeRadioProps {
  value: ScheduleEventType
  onChange: (value: ScheduleEventType) => void
}

export function EventTypeRadio({ value, onChange }: EventTypeRadioProps) {
  const { t } = useTranslation()

  return (
    <div role="radiogroup" aria-label={t('schedules.event.typeLabel')} className="flex gap-2">
      {OPTIONS.map(({ type, labelKey, icon: Icon }) => {
        const selected = value === type
        return (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => {
              onChange(type)
            }}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-tertiary/50',
              selected
                ? 'border-brand/30 bg-brand/5 text-primary dark:border-brand/20 dark:bg-brand/10'
                : 'border-secondary bg-panel text-secondary hover:border-brand/50',
            )}
          >
            <Icon className="size-4" />
            {t(labelKey)}
          </button>
        )
      })}
    </div>
  )
}

import { useTranslation } from 'react-i18next'

import type { ScheduleFit } from '@/features/schedules/types/schedule.types'
import { cn } from '@/lib/utils'

const FIT_OPTIONS: ScheduleFit[] = ['fit', 'crop', 'stretch']

interface FittingOptionsProps {
  value: ScheduleFit
  onChange: (value: ScheduleFit) => void
}

export function FittingOptions({ value, onChange }: FittingOptionsProps) {
  const { t } = useTranslation()

  return (
    <div role="radiogroup" aria-label={t('schedules.event.fitting')} className="flex gap-2">
      {FIT_OPTIONS.map((fit) => {
        const selected = value === fit
        return (
          <button
            key={fit}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => {
              onChange(fit)
            }}
            className={cn(
              'flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-tertiary/50',
              selected
                ? 'border-brand/30 bg-brand/5 text-primary dark:border-brand/20 dark:bg-brand/10'
                : 'border-secondary bg-panel text-secondary hover:border-brand/50',
            )}
          >
            {t(`schedules.event.fit.${fit}`)}
          </button>
        )
      })}
    </div>
  )
}

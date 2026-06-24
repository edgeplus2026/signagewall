import { useTranslation } from 'react-i18next'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SCHEDULE_REPEAT_OPTIONS } from '@/features/schedules/lib/scheduleRepeat'
import type { ScheduleRepeat } from '@/features/schedules/types/schedule.types'

interface RepeatSelectProps {
  value: ScheduleRepeat
  onChange: (value: ScheduleRepeat) => void
  id?: string
}

export function RepeatSelect({ value, onChange, id }: RepeatSelectProps) {
  const { t } = useTranslation()

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        onChange(next as ScheduleRepeat)
      }}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SCHEDULE_REPEAT_OPTIONS.map((option) => (
          <SelectItem key={option} value={option}>
            {t(`schedules.repeat.${option}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

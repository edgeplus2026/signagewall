import { ListVideo, PowerOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  CONTENT_COLOR,
  SCREEN_OFF_COLOR,
} from '@/features/schedules/lib/scheduleColors'

export function EventsStyleLegend() {
  const { t } = useTranslation()

  return (
    <div className="text-secondary flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
      <span className="flex items-center gap-1.5">
        <span
          className="flex size-5 items-center justify-center rounded-md"
          style={{ backgroundColor: CONTENT_COLOR.background, color: CONTENT_COLOR.border }}
        >
          <ListVideo className="size-3" />
        </span>
        {t('schedules.eventsStyle.content')}
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className="flex size-5 items-center justify-center rounded-md"
          style={{ backgroundColor: SCREEN_OFF_COLOR.background, color: SCREEN_OFF_COLOR.border }}
        >
          <PowerOff className="size-3" />
        </span>
        {t('schedules.eventsStyle.screenOff')}
      </span>
    </div>
  )
}

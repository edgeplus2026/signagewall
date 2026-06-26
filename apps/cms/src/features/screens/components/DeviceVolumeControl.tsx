import { Volume1Icon, Volume2Icon, VolumeXIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Slider } from '@/components/ui/slider'

interface DeviceVolumeControlProps {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}

/**
 * Presentational volume slider (0–100). Controlled by the parent, which persists
 * the value via a Save button — this component only reflects and reports the
 * current position.
 */
export function DeviceVolumeControl({
  value,
  onChange,
  disabled = false,
}: DeviceVolumeControlProps) {
  const { t } = useTranslation()
  const Icon = value === 0 ? VolumeXIcon : value < 50 ? Volume1Icon : Volume2Icon

  return (
    <div className="flex w-48 items-center gap-3">
      <Icon className="text-secondary size-4 shrink-0" />
      <Slider
        value={[value]}
        min={0}
        max={100}
        step={1}
        disabled={disabled}
        aria-label={t('screens.device.volume.label')}
        onValueChange={(next) => {
          onChange(next[0] ?? 0)
        }}
      />
      <span className="text-secondary w-9 shrink-0 text-right text-sm tabular-nums">
        {value}%
      </span>
    </div>
  )
}

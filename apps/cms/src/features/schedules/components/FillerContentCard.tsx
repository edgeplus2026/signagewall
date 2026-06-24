import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SelectMediaDialog } from '@/features/schedules/components/SelectMediaDialog'
import { SelectPlaylistDialog } from '@/features/schedules/components/SelectPlaylistDialog'
import type {
  ScheduleContentRef,
  ScheduleContentType,
} from '@/features/schedules/types/schedule.types'

interface FillerContentCardProps {
  filler: ScheduleContentRef | null
  onChange: (filler: ScheduleContentRef | null) => void
}

export function FillerContentCard({ filler, onChange }: FillerContentCardProps) {
  const { t } = useTranslation()
  const [contentType, setContentType] = useState<ScheduleContentType>(
    filler?.contentType ?? 'playlist',
  )
  const [playlistOpen, setPlaylistOpen] = useState(false)
  const [mediaOpen, setMediaOpen] = useState(false)

  const openPicker = () => {
    if (contentType === 'playlist') {
      setPlaylistOpen(true)
    } else {
      setMediaOpen(true)
    }
  }

  const onConfirm = (result: { id: string; fit: ScheduleContentRef['fit'] }) => {
    onChange({
      contentType,
      ...(contentType === 'playlist'
        ? { playlistId: result.id }
        : { mediaId: result.id }),
      fit: result.fit,
    })
  }

  return (
    <div className="border-brand/40 flex flex-col gap-2 rounded-xl border border-dashed p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <span className="text-primary text-sm font-medium">
            {t('schedules.filler.title')}
          </span>
          <span className="text-secondary text-xs leading-snug">
            {t('schedules.filler.subtitle')}
          </span>
        </div>
        {filler && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t('schedules.filler.remove')}
            onClick={() => {
              onChange(null)
            }}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>

      {filler ? (
        <div className="bg-highlight/50 text-secondary rounded-lg px-2.5 py-1.5 text-xs">
          {t(`schedules.event.${filler.contentType}`)} ·{' '}
          {t(`schedules.event.fit.${filler.fit}`)}
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <Select
          value={contentType}
          onValueChange={(value) => {
            setContentType(value as ScheduleContentType)
          }}
        >
          <SelectTrigger size="sm" className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="playlist">{t('schedules.event.playlist')}</SelectItem>
            <SelectItem value="media">{t('schedules.event.media')}</SelectItem>
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" size="sm" onClick={openPicker}>
          <Plus className="size-4" />
          {filler ? t('schedules.filler.change') : t('schedules.filler.set')}
        </Button>
      </div>

      <SelectPlaylistDialog
        open={playlistOpen}
        onOpenChange={setPlaylistOpen}
        initialId={filler?.contentType === 'playlist' ? filler.playlistId : undefined}
        initialFit={filler?.fit ?? 'fit'}
        onConfirm={onConfirm}
      />
      <SelectMediaDialog
        open={mediaOpen}
        onOpenChange={setMediaOpen}
        initialId={filler?.contentType === 'media' ? filler.mediaId : undefined}
        initialFit={filler?.fit ?? 'fit'}
        onConfirm={onConfirm}
      />
    </div>
  )
}

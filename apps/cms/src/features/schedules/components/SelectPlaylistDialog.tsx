import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { usePlaylists } from '@/features/playlists/hooks/usePlaylists'
import {
  ContentPickerDialog,
  type PickItem,
} from '@/features/schedules/components/ContentPickerDialog'
import type { ScheduleFit } from '@/features/schedules/types/schedule.types'

interface SelectPlaylistDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialId?: string | undefined
  initialFit: ScheduleFit
  onConfirm: (result: { id: string; name: string; fit: ScheduleFit }) => void
}

export function SelectPlaylistDialog({
  open,
  onOpenChange,
  initialId,
  initialFit,
  onConfirm,
}: SelectPlaylistDialogProps) {
  const { t } = useTranslation()
  const { data, isLoading } = usePlaylists()

  const items = useMemo<PickItem[]>(
    () => (data ?? []).map((playlist) => ({ id: playlist.id, name: playlist.name })),
    [data],
  )

  return (
    <ContentPickerDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('schedules.picker.selectPlaylist')}
      items={items}
      isLoading={isLoading}
      initialId={initialId}
      initialFit={initialFit}
      onConfirm={onConfirm}
    />
  )
}

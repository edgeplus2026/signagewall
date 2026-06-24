import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { useAllMediaFiles } from '@/features/media/hooks/useMedia'
import {
  ContentPickerDialog,
  type PickItem,
} from '@/features/schedules/components/ContentPickerDialog'
import type { ScheduleFit } from '@/features/schedules/types/schedule.types'

interface SelectMediaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialId?: string | undefined
  initialFit: ScheduleFit
  onConfirm: (result: { id: string; name: string; fit: ScheduleFit }) => void
}

export function SelectMediaDialog({
  open,
  onOpenChange,
  initialId,
  initialFit,
  onConfirm,
}: SelectMediaDialogProps) {
  const { t } = useTranslation()
  const { data, isLoading } = useAllMediaFiles()

  const items = useMemo<PickItem[]>(
    () =>
      (data ?? [])
        .filter(
          (item) =>
            (item.type === 'image' || item.type === 'video') &&
            (item.status ?? 'ready') === 'ready',
        )
        .map((item) => ({ id: item.id, name: item.name })),
    [data],
  )

  return (
    <ContentPickerDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('schedules.picker.selectMedia')}
      items={items}
      isLoading={isLoading}
      initialId={initialId}
      initialFit={initialFit}
      onConfirm={onConfirm}
    />
  )
}

import { CalendarClock, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { DeleteScheduleDialog } from '@/features/schedules/components/DeleteScheduleDialog'
import { SchedulesBrowser } from '@/features/schedules/components/SchedulesBrowser'
import {
  useDeleteSchedules,
  useSchedules,
} from '@/features/schedules/hooks/useSchedules'
import type { ScheduleSummary } from '@/features/schedules/types/schedule.types'
import { getApiErrorMessage } from '@/lib/api-error'

export default function SchedulesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data, isLoading } = useSchedules()
  const deleteSchedules = useDeleteSchedules()
  const [toDelete, setToDelete] = useState<ScheduleSummary | null>(null)

  const schedules = data ?? []
  const isEmpty = !isLoading && schedules.length === 0

  const handleDelete = async () => {
    if (!toDelete) return
    try {
      await deleteSchedules.mutateAsync([toDelete.id])
      toast.success(t('schedules.delete.success'))
      setToDelete(null)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('schedules.delete.error')))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-primary text-xl font-semibold">
            {t('schedules.title')}
          </h1>
          <p className="text-secondary text-sm">
            {t('schedules.scheduleCount', { count: schedules.length })}
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => void navigate('/schedules/new')}>
          <Plus />
          {t('schedules.add')}
        </Button>
      </header>

      {isEmpty ? (
        <div className="border-secondary flex flex-col items-center gap-4 rounded-xl border border-dashed py-16 text-center">
          <span className="bg-highlight text-brand flex size-12 items-center justify-center rounded-full">
            <CalendarClock className="size-6" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-primary font-medium">{t('schedules.empty.title')}</p>
            <p className="text-secondary max-w-sm text-sm">
              {t('schedules.empty.description')}
            </p>
          </div>
          <Button type="button" onClick={() => void navigate('/schedules/new')}>
            <Plus />
            {t('schedules.add')}
          </Button>
        </div>
      ) : (
        <SchedulesBrowser
          schedules={schedules}
          isLoading={isLoading}
          onDelete={setToDelete}
        />
      )}

      <DeleteScheduleDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
        scheduleName={toDelete?.name}
        isPending={deleteSchedules.isPending}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}

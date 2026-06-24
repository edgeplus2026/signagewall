import { Monitor } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { AssignScreensDialog } from '@/features/schedules/components/AssignScreensDialog'
import { EventDialog } from '@/features/schedules/components/EventDialog'
import { EventsStyleLegend } from '@/features/schedules/components/EventsStyleLegend'
import { FillerContentCard } from '@/features/schedules/components/FillerContentCard'
import { RecurringEditScopeDialog } from '@/features/schedules/components/RecurringEditScopeDialog'
import { ScheduleBreadcrumb } from '@/features/schedules/components/ScheduleBreadcrumb'
import {
  ScheduleCalendar,
  type CalendarEventChange,
} from '@/features/schedules/components/ScheduleCalendar'
import { ScheduledEventsList } from '@/features/schedules/components/ScheduledEventsList'
import {
  useAssignScheduleScreens,
  useCreateSchedule,
  useReplaceScheduleEvents,
  useSchedule,
  useScheduleScreens,
  useUpdateSchedule,
} from '@/features/schedules/hooks/useSchedules'
import {
  draftEventsToInput,
  draftToCreateRequest,
  draftToUpdateRequest,
  emptyDraft,
  scheduleToDraft,
  type ScheduleDraft,
} from '@/features/schedules/lib/scheduleDraft'
import {
  applyRecurringEdit,
  type OccurrenceEdit,
} from '@/features/schedules/lib/scheduleRecurrence'
import type {
  RecurringEditScope,
  ScheduleEvent,
} from '@/features/schedules/types/schedule.types'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'

function upsertEvent(events: ScheduleEvent[], event: ScheduleEvent): ScheduleEvent[] {
  const index = events.findIndex((e) => e.id === event.id)
  if (index === -1) {
    return [...events, event]
  }
  const next = [...events]
  next[index] = event
  return next
}

export default function ScheduleEditorPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { scheduleId } = useParams<{ scheduleId: string }>()
  const isNew = !scheduleId

  const scheduleQuery = useSchedule(scheduleId ?? null)
  const screensQuery = useScheduleScreens(scheduleId ?? null)
  const schedule = scheduleQuery.data

  const createSchedule = useCreateSchedule()
  const updateSchedule = useUpdateSchedule()
  const replaceEvents = useReplaceScheduleEvents()
  const assignScreens = useAssignScheduleScreens()

  const assignedScreenIds = useMemo(
    () => (screensQuery.data ?? []).map((screen) => screen.id),
    [screensQuery.data],
  )

  const serverDraft = useMemo<ScheduleDraft | null>(() => {
    if (isNew) return emptyDraft()
    if (!schedule) return null
    return scheduleToDraft(schedule, assignedScreenIds)
  }, [isNew, schedule, assignedScreenIds])

  const [savedDraft, setSavedDraft] = useState<ScheduleDraft>(() => emptyDraft())
  const [draft, setDraft] = useState<ScheduleDraft>(() => emptyDraft())
  const savedRef = useRef(savedDraft)

  // Seed/re-seed from the server only when there are no pending local edits.
  const serializedServer = serverDraft ? JSON.stringify(serverDraft) : null
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!serverDraft) return
    setDraft((current) =>
      JSON.stringify(current) === JSON.stringify(savedRef.current)
        ? serverDraft
        : current,
    )
    savedRef.current = serverDraft
    setSavedDraft(serverDraft)
  }, [serializedServer])
  /* eslint-enable react-hooks/exhaustive-deps */

  const commitSaved = (next: ScheduleDraft) => {
    savedRef.current = next
    setSavedDraft(next)
    setDraft(next)
  }

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(savedDraft),
    [draft, savedDraft],
  )

  // --- dialogs ---
  const [eventDialogOpen, setEventDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null)
  const [defaultRange, setDefaultRange] = useState<{
    start: { date: string; time: string }
    end: { date: string; time: string }
  } | null>(null)
  const [assignOpen, setAssignOpen] = useState(false)
  const [pendingChange, setPendingChange] = useState<CalendarEventChange | null>(null)

  const patch = (next: Partial<ScheduleDraft>) => {
    setDraft((current) => ({ ...current, ...next }))
  }

  const openNewEvent = () => {
    setEditingEvent(null)
    setDefaultRange(null)
    setEventDialogOpen(true)
  }

  const handleSelectRange = (
    start: { date: string; time: string },
    end: { date: string; time: string },
  ) => {
    setEditingEvent(null)
    setDefaultRange({ start, end })
    setEventDialogOpen(true)
  }

  const handleEventClick = (event: ScheduleEvent) => {
    setEditingEvent(event)
    setDefaultRange(null)
    setEventDialogOpen(true)
  }

  const handleSaveEvent = (event: ScheduleEvent) => {
    patch({ events: upsertEvent(draft.events, event) })
  }

  const handleDeleteEvent = (event: ScheduleEvent) => {
    patch({ events: draft.events.filter((e) => e.id !== event.id) })
  }

  const handleEventChange = (change: CalendarEventChange) => {
    if (!change.isRecurring) {
      patch({
        events: draft.events.map((e) =>
          e.id === change.event.id
            ? {
                ...e,
                startDate: change.newStartDate,
                startTime: change.newStartTime,
                endDate: change.newEndDate,
                endTime: change.newEndTime,
              }
            : e,
        ),
      })
      return
    }
    setPendingChange(change)
  }

  const applyScope = (scope: RecurringEditScope) => {
    if (!pendingChange) return
    const edit: OccurrenceEdit = {
      originalDate: pendingChange.originalDate,
      newStartDate: pendingChange.newStartDate,
      newStartTime: pendingChange.newStartTime,
      newEndDate: pendingChange.newEndDate,
      newEndTime: pendingChange.newEndTime,
    }
    patch({
      events: applyRecurringEdit(draft.events, pendingChange.event.id, scope, edit),
    })
    setPendingChange(null)
  }

  const cancelScope = () => {
    pendingChange?.revert()
    setPendingChange(null)
  }

  const handleCancel = () => {
    if (isNew) {
      void navigate('/schedules')
    } else {
      setDraft(savedDraft)
    }
  }

  const isSaving =
    createSchedule.isPending ||
    updateSchedule.isPending ||
    replaceEvents.isPending ||
    assignScreens.isPending

  const handleSave = async () => {
    if (!draft.name.trim()) {
      toast.error(t('schedules.validation.nameRequired'))
      return
    }

    const screensChanged =
      JSON.stringify([...draft.screenIds].sort()) !==
      JSON.stringify([...savedDraft.screenIds].sort())

    try {
      if (isNew) {
        const created = await createSchedule.mutateAsync(draftToCreateRequest(draft))
        const savedEvents = draft.events.length
          ? await replaceEvents.mutateAsync({
              id: created.id,
              payload: { events: draftEventsToInput(draft.events) },
            })
          : []
        if (draft.screenIds.length) {
          await assignScreens.mutateAsync({
            id: created.id,
            payload: { screenIds: draft.screenIds },
          })
        }
        commitSaved({ ...draft, events: savedEvents })
        toast.success(t('schedules.editor.created'))
        void navigate(`/schedules/${created.id}`, { replace: true })
        return
      }

      const id = scheduleId
      // Events first (optimistic-locked), then meta, then assignment — so the
      // events write's `expectedUpdatedAt` matches the version we loaded.
      const savedEvents = await replaceEvents.mutateAsync({
        id,
        payload: {
          events: draftEventsToInput(draft.events),
          ...(schedule ? { expectedUpdatedAt: schedule.updatedAt } : {}),
        },
      })
      await updateSchedule.mutateAsync({ id, payload: draftToUpdateRequest(draft) })
      if (screensChanged) {
        await assignScreens.mutateAsync({ id, payload: { screenIds: draft.screenIds } })
      }
      commitSaved({ ...draft, events: savedEvents, screenIds: [...draft.screenIds].sort() })
      toast.success(t('schedules.editor.changesPushed'))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('schedules.editor.saveError')))
    }
  }

  // Loading / not-found states for an existing schedule. `data === null` only
  // after the query resolves to a missing schedule (undefined while loading).
  if (!isNew && scheduleQuery.data === null) {
    return (
      <div className="flex flex-col gap-4">
        <ScheduleBreadcrumb />
        <p className="text-secondary py-16 text-center text-sm">
          {t('schedules.editor.notFound')}
        </p>
      </div>
    )
  }
  if (!isNew && !schedule) {
    return <Skeleton className="h-[70dvh] w-full rounded-xl" />
  }

  return (
    <div className="flex h-[calc(100dvh-7rem)] flex-col gap-3">
      <ScheduleBreadcrumb scheduleName={isNew ? undefined : draft.name} />

      <div className="flex items-center justify-between gap-3">
        <Input
          value={draft.name}
          onChange={(e) => {
            patch({ name: e.target.value })
          }}
          placeholder={t('schedules.editor.namePlaceholder')}
          className="max-w-xs font-medium"
          aria-label={t('schedules.editor.nameLabel')}
        />
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-medium',
              isDirty
                ? 'bg-warning/10 text-warning'
                : 'bg-success/10 text-success',
            )}
          >
            {isDirty
              ? t('schedules.editor.unsaved')
              : t('schedules.editor.changesPushed')}
          </span>
          <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!isDirty || isSaving}
            onClick={() => void handleSave()}
          >
            {t('common.save')}
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        <ScheduleCalendar
          events={draft.events}
          onAddEvent={openNewEvent}
          onEventClick={handleEventClick}
          onSelectRange={handleSelectRange}
          onEventChange={handleEventChange}
        />

        <aside className="bg-panel flex w-80 shrink-0 flex-col gap-4 overflow-y-auto rounded-xl p-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-primary text-sm font-semibold">
              {t('schedules.events.listTitle')}
            </h2>
            <p className="text-secondary text-xs leading-snug">
              {t('schedules.events.listHint')}
            </p>
          </div>

          <EventsStyleLegend />

          <div className="flex flex-col gap-2">
            <span className="text-primary text-xs font-medium tracking-wide uppercase">
              {t('schedules.events.scheduledTitle')}
            </span>
            <ScheduledEventsList
              events={draft.events}
              onReorder={(events) => {
                patch({ events })
              }}
              onEdit={handleEventClick}
              onDelete={handleDeleteEvent}
            />
          </div>

          <FillerContentCard
            filler={draft.filler}
            onChange={(filler) => {
              patch({ filler })
            }}
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-auto"
            onClick={() => {
              setAssignOpen(true)
            }}
          >
            <Monitor />
            {t('schedules.assignScreens.view', { count: draft.screenIds.length })}
          </Button>
        </aside>
      </div>

      <EventDialog
        open={eventDialogOpen}
        onOpenChange={setEventDialogOpen}
        event={editingEvent}
        defaultStart={defaultRange?.start}
        defaultEnd={defaultRange?.end}
        onSave={handleSaveEvent}
      />

      <AssignScreensDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        value={draft.screenIds}
        onChange={(screenIds) => {
          patch({ screenIds })
        }}
      />

      <RecurringEditScopeDialog
        open={Boolean(pendingChange)}
        onSelect={applyScope}
        onCancel={cancelScope}
      />
    </div>
  )
}

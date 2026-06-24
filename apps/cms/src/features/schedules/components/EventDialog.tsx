import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EventTypeRadio } from '@/features/schedules/components/EventTypeRadio'
import { RepeatSelect } from '@/features/schedules/components/RepeatSelect'
import { SelectMediaDialog } from '@/features/schedules/components/SelectMediaDialog'
import { SelectPlaylistDialog } from '@/features/schedules/components/SelectPlaylistDialog'
import { formatDate } from '@/features/schedules/lib/scheduleDates'
import { newEventId } from '@/features/schedules/lib/scheduleDraft'
import { createScheduleEventSchema } from '@/features/schedules/schemas/scheduleSchemas'
import type {
  ScheduleContentType,
  ScheduleEvent,
  ScheduleEventType,
  ScheduleFit,
  ScheduleRepeat,
} from '@/features/schedules/types/schedule.types'

interface EventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: ScheduleEvent | null
  defaultStart?: { date: string; time: string } | undefined
  defaultEnd?: { date: string; time: string } | undefined
  onSave: (event: ScheduleEvent) => void
}

interface FormState {
  type: ScheduleEventType
  contentType: ScheduleContentType
  contentId: string
  contentName: string
  fit: ScheduleFit
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  repeat: ScheduleRepeat
}

function initialState(
  event: ScheduleEvent | null,
  defaultStart?: { date: string; time: string },
  defaultEnd?: { date: string; time: string },
): FormState {
  if (event) {
    return {
      type: event.type,
      contentType: event.contentType ?? 'playlist',
      contentId: event.playlistId ?? event.mediaId ?? '',
      contentName: event.name ?? '',
      fit: event.fit ?? 'fit',
      startDate: event.startDate,
      startTime: event.startTime,
      endDate: event.endDate,
      endTime: event.endTime,
      repeat: event.repeat,
    }
  }
  const today = formatDate(new Date())
  return {
    type: 'content',
    contentType: 'playlist',
    contentId: '',
    contentName: '',
    fit: 'fit',
    startDate: defaultStart?.date ?? today,
    startTime: defaultStart?.time ?? '09:00',
    endDate: defaultEnd?.date ?? defaultStart?.date ?? today,
    endTime: defaultEnd?.time ?? '10:00',
    repeat: 'none',
  }
}

export function EventDialog({
  open,
  onOpenChange,
  event,
  defaultStart,
  defaultEnd,
  onSave,
}: EventDialogProps) {
  const { t } = useTranslation()
  const [state, setState] = useState<FormState>(() =>
    initialState(event, defaultStart, defaultEnd),
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [playlistPickerOpen, setPlaylistPickerOpen] = useState(false)
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false)

  const schema = useMemo(() => createScheduleEventSchema(t), [t])

  // Reset the form to the event/defaults each time the dialog opens.
  // defaultStart/defaultEnd identity is stable per-open from the parent.
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (open) {
      setState(initialState(event, defaultStart, defaultEnd))
      setErrors({})
    }
  }, [open, event])
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  const patch = (next: Partial<FormState>) => {
    setState((current) => ({ ...current, ...next }))
  }

  const openPicker = () => {
    if (state.contentType === 'playlist') {
      setPlaylistPickerOpen(true)
    } else {
      setMediaPickerOpen(true)
    }
  }

  const onContentConfirm = (result: { id: string; name: string; fit: ScheduleFit }) => {
    patch({ contentId: result.id, contentName: result.name, fit: result.fit })
  }

  const submit = () => {
    const result = schema.safeParse({
      type: state.type,
      contentType: state.contentType,
      contentId: state.contentId,
      fit: state.fit,
      startDate: state.startDate,
      startTime: state.startTime,
      endDate: state.endDate,
      endTime: state.endTime,
      repeat: state.repeat,
    })

    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0]
        if (typeof key === 'string' && !fieldErrors[key]) {
          fieldErrors[key] = issue.message
        }
      }
      setErrors(fieldErrors)
      // Surface the block so a save that can't proceed isn't silent (the most
      // common case: a content event with no playlist/media selected).
      toast.error(fieldErrors.contentId ?? t('schedules.event.invalid'))
      return
    }

    const isContent = state.type === 'content'
    const built: ScheduleEvent = {
      id: event?.id ?? newEventId(),
      order: event?.order ?? 0,
      excludedDates: event?.excludedDates ?? [],
      type: state.type,
      repeat: state.repeat,
      startDate: state.startDate,
      endDate: state.endDate,
      startTime: state.startTime,
      endTime: state.endTime,
      ...(isContent
        ? {
            name: state.contentName,
            contentType: state.contentType,
            fit: state.fit,
            ...(state.contentType === 'playlist'
              ? { playlistId: state.contentId }
              : { mediaId: state.contentId }),
          }
        : {}),
    }

    onSave(built)
    onOpenChange(false)
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        showCloseButton={false}
        onInteractOutside={(e) => {
          // Don't let an outside click (incl. a content-picker click-through)
          // dismiss the form and drop the in-progress event.
          e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {event ? t('schedules.event.editTitle') : t('schedules.event.newTitle')}
          </DialogTitle>
          <DialogDescription>{t('schedules.event.tzNote')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel>{t('schedules.event.typeLabel')}</FieldLabel>
            <EventTypeRadio
              value={state.type}
              onChange={(type) => {
                patch({ type })
              }}
            />
          </Field>

          {state.type === 'content' && (
            <>
              <Field>
                <FieldLabel htmlFor="event-content-type">
                  {t('schedules.event.contentType')}
                </FieldLabel>
                <Select
                  value={state.contentType}
                  onValueChange={(value) => {
                    // Switching type clears the previous selection.
                    patch({
                      contentType: value as ScheduleContentType,
                      contentId: '',
                      contentName: '',
                    })
                  }}
                >
                  <SelectTrigger id="event-content-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="playlist">
                      {t('schedules.event.playlist')}
                    </SelectItem>
                    <SelectItem value="media">{t('schedules.event.media')}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field data-invalid={!!errors.contentId}>
                <FieldLabel>{t('schedules.event.content')}</FieldLabel>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between font-normal"
                  onClick={openPicker}
                >
                  <span className={state.contentName ? 'text-primary' : 'text-secondary'}>
                    {state.contentName || t('schedules.event.selectContent')}
                  </span>
                  {state.contentName && (
                    <span className="text-secondary text-xs">
                      {t(`schedules.event.fit.${state.fit}`)}
                    </span>
                  )}
                </Button>
                <FieldError errors={[errors.contentId ? { message: errors.contentId } : undefined]} />
              </Field>
            </>
          )}

          <Field data-invalid={!!errors.startDate}>
            <FieldLabel>{t('schedules.event.starts')}</FieldLabel>
            <div className="flex gap-2">
              <Input
                type="date"
                aria-label={t('schedules.event.starts')}
                className="flex-1"
                value={state.startDate}
                max={state.endDate || undefined}
                onChange={(e) => {
                  patch({ startDate: e.target.value })
                }}
              />
              <Input
                type="time"
                aria-label={t('schedules.event.startTime')}
                className="w-28"
                value={state.startTime}
                onChange={(e) => {
                  patch({ startTime: e.target.value })
                }}
              />
            </div>
          </Field>

          <Field data-invalid={!!errors.endDate || !!errors.endTime}>
            <FieldLabel>{t('schedules.event.ends')}</FieldLabel>
            <div className="flex gap-2">
              <Input
                type="date"
                aria-label={t('schedules.event.ends')}
                className="flex-1"
                value={state.endDate}
                min={state.startDate || undefined}
                onChange={(e) => {
                  patch({ endDate: e.target.value })
                }}
              />
              <Input
                type="time"
                aria-label={t('schedules.event.endTime')}
                className="w-28"
                value={state.endTime}
                onChange={(e) => {
                  patch({ endTime: e.target.value })
                }}
              />
            </div>
            <FieldError errors={[errors.endTime ? { message: errors.endTime } : undefined]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="event-repeat">{t('schedules.event.repeat')}</FieldLabel>
            <RepeatSelect
              id="event-repeat"
              value={state.repeat}
              onChange={(repeat) => {
                patch({ repeat })
              }}
            />
          </Field>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={submit}>
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Pickers are siblings (not nested in the form Dialog) so confirming one
        never dismisses the New Event modal. */}
    <SelectPlaylistDialog
      open={playlistPickerOpen}
      onOpenChange={setPlaylistPickerOpen}
      initialId={state.contentType === 'playlist' ? state.contentId || undefined : undefined}
      initialFit={state.fit}
      onConfirm={onContentConfirm}
    />
    <SelectMediaDialog
      open={mediaPickerOpen}
      onOpenChange={setMediaPickerOpen}
      initialId={state.contentType === 'media' ? state.contentId || undefined : undefined}
      initialFit={state.fit}
      onConfirm={onContentConfirm}
    />
    </>
  )
}

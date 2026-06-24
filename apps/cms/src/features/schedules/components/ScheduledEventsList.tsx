import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  AlertTriangle,
  Film,
  GripVertical,
  ListVideo,
  MoreVertical,
  PowerOff,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  CONTENT_COLOR,
  SCREEN_OFF_COLOR,
} from '@/features/schedules/lib/scheduleColors'
import type { ScheduleEvent } from '@/features/schedules/types/schedule.types'
import { cn } from '@/lib/utils'

interface ScheduledEventsListProps {
  events: ScheduleEvent[]
  onReorder: (events: ScheduleEvent[]) => void
  onEdit: (event: ScheduleEvent) => void
  onDelete: (event: ScheduleEvent) => void
}

export function ScheduledEventsList({
  events,
  onReorder,
  onEdit,
  onDelete,
}: ScheduledEventsListProps) {
  const { t } = useTranslation()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = events.findIndex((e) => e.id === active.id)
      const newIndex = events.findIndex((e) => e.id === over.id)
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorder(arrayMove(events, oldIndex, newIndex))
      }
    }
  }

  if (events.length === 0) {
    return (
      <p className="text-secondary px-1 py-4 text-center text-[13px]">
        {t('schedules.events.empty')}
      </p>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={events.map((event) => event.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-2">
          {events.map((event) => (
            <SortableEventRow
              key={event.id}
              event={event}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

interface SortableEventRowProps {
  event: ScheduleEvent
  onEdit: (event: ScheduleEvent) => void
  onDelete: (event: ScheduleEvent) => void
}

function SortableEventRow({ event, onEdit, onDelete }: SortableEventRowProps) {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: event.id })

  const isOff = event.type === 'screen_off'
  const color = isOff ? SCREEN_OFF_COLOR : CONTENT_COLOR
  const Icon = isOff ? PowerOff : event.contentType === 'media' ? Film : ListVideo
  const label = isOff
    ? t('schedules.event.type.screenOff')
    : (event.name ?? '') || t('schedules.event.untitled')
  const repeatLabel =
    event.repeat === 'none' ? '' : ` · ${t(`schedules.repeat.${event.repeat}`)}`

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group flex min-h-17 items-center gap-3 rounded-xl border px-3 py-4 transition-colors',
        isOff
          ? 'border-quaternary bg-highlight/40'
          : 'border-secondary bg-panel hover:border-brand/40',
        isDragging && 'opacity-50',
      )}
    >
      <button
        type="button"
        className="text-secondary hover:text-primary shrink-0 cursor-grab touch-none active:cursor-grabbing"
        aria-label={t('schedules.events.reorder')}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: color.background, color: color.border }}
      >
        <Icon className="size-[1.15rem]" />
      </span>

      <button
        type="button"
        className="flex min-w-0 flex-1 flex-col text-left"
        onClick={() => {
          onEdit(event)
        }}
      >
        <span className="text-primary flex items-center gap-1 truncate text-sm font-medium">
          {label}
          {event.contentMissing && (
            <AlertTriangle className="text-warning size-3.5 shrink-0" />
          )}
        </span>
        <span className="text-secondary truncate text-xs">
          {event.startTime} – {event.endTime}
          {repeatLabel}
        </span>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-secondary shrink-0"
            aria-label={t('common.actions')}
          >
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => {
              onEdit(event)
            }}
          >
            {t('schedules.events.edit')}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="danger"
            onClick={() => {
              onDelete(event)
            }}
          >
            {t('schedules.events.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

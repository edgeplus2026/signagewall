import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { FieldType } from '@edge/apps-contract'
import { FileUpIcon, GripVertical, Plus, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { RowImageControl } from '@/features/apps/config-form/RowImageControl'
import {
  type FieldControlProps,
  NumberControl,
  SelectControl,
  SwitchControl,
  TextControl,
} from '@/features/apps/config-form/controls'
import { CsvImportDialog } from '@/features/apps/config-form/tabular/CsvImportDialog'

type Row = Record<string, unknown>

/**
 * Which control renders each sub-field type inside a row. Only the simple types
 * make sense as columns; anything else falls back to a text input. These come
 * straight from `controls` (a leaf module), so there is no cycle with the field
 * registry that imports this control.
 */
const ROW_CONTROLS: Partial<
  Record<FieldType, (props: FieldControlProps) => ReactNode>
> = {
  text: TextControl,
  url: TextControl,
  number: NumberControl,
  select: SelectControl,
  switch: SwitchControl,
  checkbox: SwitchControl,
  // Compact thumbnail cell; uploads through the media pipeline to an R2 URL.
  image: RowImageControl,
}

/** Sub-field types that render as a fixed-width cell, not a 1fr grid column. */
const COMPACT_ROW_TYPES = new Set<FieldType>(['image'])

/** "Items" → "item", "Places" → "place" — for the add button label. */
function singular(label: string): string {
  const lower = label.trim().toLowerCase()
  return lower.replace(/s$/, '') || 'row'
}

/**
 * A repeating list of rows (the `repeater` field type). Each row is an object
 * keyed by the field's `fields`; rows are reordered by dragging the handle
 * (keyboard: space to lift, arrows to move). A single-sub-field repeater (e.g.
 * the ticker's messages) renders as one compact line per row — handle, input,
 * remove; multi-sub-field rows lay their columns out in a grid. The value is
 * the array of row objects.
 */
export function RepeaterControl({
  field,
  value,
  onChange,
  onBlur,
  disabled,
}: FieldControlProps) {
  const { t } = useTranslation()
  const subFields = field.fields ?? []
  const rows: Row[] = Array.isArray(value) ? (value as Row[]) : []
  const [csvOpen, setCsvOpen] = useState(false)

  const sensors = useSensors(
    // The activation distance keeps plain clicks (into the row's inputs) from
    // starting a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const addRow = (): void => {
    const blank: Row = {}
    for (const sub of subFields) {
      if (sub.default !== undefined) blank[sub.key] = sub.default
    }
    onChange([...rows, blank])
    onBlur()
  }

  const removeRow = (index: number): void => {
    onChange(rows.filter((_, i) => i !== index))
    onBlur()
  }

  const updateCell = (index: number, key: string, cellValue: unknown): void => {
    onChange(
      rows.map((row, i) => (i === index ? { ...row, [key]: cellValue } : row)),
    )
  }

  const onDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = Number(String(active.id).replace('row-', ''))
    const to = Number(String(over.id).replace('row-', ''))
    if (Number.isNaN(from) || Number.isNaN(to)) return
    const next = [...rows]
    const [held] = next.splice(from, 1)
    if (held === undefined) return
    next.splice(to, 0, held)
    onChange(next)
    onBlur()
  }

  // Index-keyed sortable ids are stable for the duration of one drag (the rows
  // array only changes on drop), which is all dnd-kit needs.
  const sortableIds = rows.map((_, index) => `row-${String(index)}`)

  return (
    <div className="flex flex-col gap-1.5">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={sortableIds}
          strategy={verticalListSortingStrategy}
        >
          {rows.map((row, index) => (
            <RepeaterRow
              key={index}
              sortableId={`row-${String(index)}`}
              row={row}
              index={index}
              fieldKey={field.key}
              subFields={subFields}
              disabled={disabled}
              onRemove={() => { removeRow(index); }}
              onCell={(key, cellValue) => { updateCell(index, key, cellValue); }}
              onBlur={onBlur}
            />
          ))}
        </SortableContext>
      </DndContext>
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={addRow}
        >
          <Plus className="size-4" />
          Add {singular(field.label)}
        </Button>
        {field.csvImport ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => {
              setCsvOpen(true)
            }}
          >
            <FileUpIcon className="size-4" />
            {t('apps.tabular.csv.button')}
          </Button>
        ) : null}
      </div>
      {field.csvImport ? (
        <CsvImportDialog
          open={csvOpen}
          onOpenChange={setCsvOpen}
          subFields={subFields}
          hasExistingRows={rows.length > 0}
          onImport={(imported, mode) => {
            onChange(mode === 'append' ? [...rows, ...imported] : imported)
            onBlur()
          }}
        />
      ) : null}
    </div>
  )
}

interface RepeaterRowProps {
  sortableId: string
  row: Row
  index: number
  fieldKey: string
  subFields: NonNullable<FieldControlProps['field']['fields']>
  disabled: boolean | undefined
  onRemove: () => void
  onCell: (key: string, cellValue: unknown) => void
  onBlur: () => void
}

function RepeaterRow({
  sortableId,
  row,
  index,
  fieldKey,
  subFields,
  disabled,
  onRemove,
  onCell,
  onBlur,
}: RepeaterRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId, disabled: disabled ?? false })

  // One sub-field (the common case — e.g. ticker messages): a single compact
  // line. Several sub-fields: label + control per column, same row chrome.
  const compact = subFields.length === 1

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`border-secondary bg-panel flex items-center gap-1.5 rounded-lg border p-1.5 ${
        isDragging ? 'z-10 opacity-80 shadow-lg' : ''
      }`}
    >
      <button
        type="button"
        className="text-secondary hover:text-primary flex h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded active:cursor-grabbing"
        aria-label="Reorder"
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      {compact ? (
        (() => {
          const sub = subFields[0]
          if (!sub) return null
          const Control = ROW_CONTROLS[sub.type] ?? TextControl
          return (
            <div className="min-w-0 flex-1">
              <Control
                field={sub}
                id={`${fieldKey}-${String(index)}-${sub.key}`}
                value={row[sub.key]}
                onChange={(cellValue) => { onCell(sub.key, cellValue); }}
                onBlur={onBlur}
                invalid={false}
                disabled={disabled}
              />
            </div>
          )
        })()
      ) : (
        <div
          className="grid min-w-0 flex-1 gap-2"
          style={{
            // Compact cells (the image thumbnail) size to content; text-like
            // cells share the remaining width.
            gridTemplateColumns: subFields
              .map((sub) => (COMPACT_ROW_TYPES.has(sub.type) ? 'auto' : 'minmax(0, 1fr)'))
              .join(' '),
          }}
        >
          {subFields.map((sub) => {
            const Control = ROW_CONTROLS[sub.type] ?? TextControl
            return (
              <div key={sub.key} className="flex min-w-0 flex-col gap-1">
                <span className="text-xs opacity-70">{sub.label}</span>
                <Control
                  field={sub}
                  id={`${fieldKey}-${String(index)}-${sub.key}`}
                  value={row[sub.key]}
                  onChange={(cellValue) => { onCell(sub.key, cellValue); }}
                  onBlur={onBlur}
                  invalid={false}
                  disabled={disabled}
                />
              </div>
            )
          })}
        </div>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Remove"
        className="shrink-0"
        disabled={disabled}
        onClick={onRemove}
      >
        <Trash2 />
      </Button>
    </div>
  )
}

import type { FieldType } from '@edge/apps-contract'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import {
  type FieldControlProps,
  NumberControl,
  SelectControl,
  SwitchControl,
  TextControl,
} from '@/features/apps/config-form/controls'

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
}

/** "Items" → "item", "Places" → "place" — for the add button label. */
function singular(label: string): string {
  const lower = label.trim().toLowerCase()
  return lower.replace(/s$/, '') || 'row'
}

/**
 * A repeating list of rows (the `repeater` field type). Each row is an object
 * keyed by the field's `fields`; the control renders one column per sub-field
 * and lets the operator add, remove and reorder rows. The value is the array of
 * row objects.
 */
export function RepeaterControl({
  field,
  value,
  onChange,
  onBlur,
  disabled,
}: FieldControlProps) {
  const subFields = field.fields ?? []
  const rows: Row[] = Array.isArray(value) ? (value as Row[]) : []

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

  const moveRow = (index: number, delta: number): void => {
    const target = index + delta
    if (target < 0 || target >= rows.length) return
    const next = [...rows]
    const [held] = next.splice(index, 1)
    next.splice(target, 0, held as Row)
    onChange(next)
    onBlur()
  }

  const updateCell = (index: number, key: string, cellValue: unknown): void => {
    onChange(
      rows.map((row, i) => (i === index ? { ...row, [key]: cellValue } : row)),
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row, index) => (
        <div
          // Rows have no stable id; index is fine — the list is small and only
          // ever reordered/edited through these handlers.
          key={index}
          className="flex flex-col gap-2 rounded-lg border border-secondary bg-panel p-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs opacity-60">#{index + 1}</span>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Move up"
                disabled={disabled || index === 0}
                onClick={() => moveRow(index, -1)}
              >
                <ChevronUp />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Move down"
                disabled={disabled || index === rows.length - 1}
                onClick={() => moveRow(index, 1)}
              >
                <ChevronDown />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Remove"
                disabled={disabled}
                onClick={() => removeRow(index)}
              >
                <Trash2 />
              </Button>
            </div>
          </div>
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${Math.max(1, subFields.length)}, minmax(0, 1fr))`,
            }}
          >
            {subFields.map((sub) => {
              const Control = ROW_CONTROLS[sub.type] ?? TextControl
              return (
                <div key={sub.key} className="flex flex-col gap-1">
                  <span className="text-xs opacity-70">{sub.label}</span>
                  <Control
                    field={sub}
                    id={`${field.key}-${index}-${sub.key}`}
                    value={row[sub.key]}
                    onChange={(cellValue) => updateCell(index, sub.key, cellValue)}
                    onBlur={onBlur}
                    invalid={false}
                    disabled={disabled}
                  />
                </div>
              )
            })}
          </div>
        </div>
      ))}
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
    </div>
  )
}

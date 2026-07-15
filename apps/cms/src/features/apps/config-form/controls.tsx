import type { Field } from '@edge/apps-contract'

import { Checkbox } from '@/components/ui/checkbox'
import { ImageUploader } from '@/components/ui/image-uploader'
import { Input } from '@/components/ui/input'
import { MultiSelect } from '@/components/ui/multi-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

/** Props every field control receives from the renderer. */
export interface FieldControlProps {
  field: Field
  id: string
  value: unknown
  onChange: (value: unknown) => void
  onBlur: () => void
  invalid: boolean
  disabled?: boolean | undefined
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function TextControl({ field, id, value, onChange, onBlur, invalid, disabled }: FieldControlProps) {
  return (
    <Input
      id={id}
      type={field.type === 'url' ? 'url' : 'text'}
      value={asString(value)}
      placeholder={field.placeholder}
      aria-invalid={invalid}
      disabled={disabled}
      onChange={(event) => {
        onChange(event.target.value)
      }}
      onBlur={onBlur}
    />
  )
}

export function TextareaControl({ field, id, value, onChange, onBlur, invalid, disabled }: FieldControlProps) {
  return (
    <Textarea
      id={id}
      rows={3}
      value={asString(value)}
      placeholder={field.placeholder}
      aria-invalid={invalid}
      disabled={disabled}
      onChange={(event) => {
        onChange(event.target.value)
      }}
      onBlur={onBlur}
      // The base textarea grows with its content (`field-sizing-content`), which
      // pushes the rest of the config form off-screen on a long value. Cap it and
      // scroll instead; the floor stays ~3 rows.
      className="max-h-40 min-h-18 overflow-y-auto"
    />
  )
}

export function NumberControl({ field, id, value, onChange, onBlur, invalid, disabled }: FieldControlProps) {
  return (
    <Input
      id={id}
      type="number"
      value={typeof value === 'number' ? value : ''}
      placeholder={field.placeholder}
      aria-invalid={invalid}
      disabled={disabled}
      onChange={(event) => {
        const raw = event.target.value
        onChange(raw === '' ? undefined : Number(raw))
      }}
      onBlur={onBlur}
    />
  )
}

export function SelectControl({ field, id, value, onChange, onBlur, invalid, disabled }: FieldControlProps) {
  return (
    <Select
      value={asString(value)}
      disabled={disabled ?? false}
      onValueChange={(next) => {
        onChange(next)
        onBlur()
      }}
    >
      <SelectTrigger id={id} aria-invalid={invalid} className="w-full">
        <SelectValue placeholder={field.placeholder} />
      </SelectTrigger>
      <SelectContent>
        {(field.options ?? []).map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function MultiSelectControl({ field, id, value, onChange, onBlur, invalid, disabled }: FieldControlProps) {
  return (
    <MultiSelect
      id={id}
      value={Array.isArray(value) ? (value as string[]) : []}
      options={field.options ?? []}
      placeholder={field.placeholder}
      aria-invalid={invalid}
      disabled={disabled}
      onChange={onChange}
      onBlur={onBlur}
    />
  )
}

export function CheckboxControl({ id, value, onChange, onBlur, invalid, disabled }: FieldControlProps) {
  return (
    <Checkbox
      id={id}
      checked={value === true}
      aria-invalid={invalid}
      disabled={disabled}
      onCheckedChange={(checked) => {
        onChange(checked === true)
        onBlur()
      }}
    />
  )
}

export function SwitchControl({ id, value, onChange, onBlur, disabled }: FieldControlProps) {
  return (
    <Switch
      id={id}
      checked={value === true}
      disabled={disabled}
      onCheckedChange={(checked) => {
        onChange(checked)
        onBlur()
      }}
    />
  )
}

export function ColorControl({ id, value, onChange, onBlur, invalid, disabled }: FieldControlProps) {
  const color = asString(value) || '#000000'
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={color}
        disabled={disabled}
        aria-label="Color"
        onChange={(event) => {
          onChange(event.target.value)
        }}
        onBlur={onBlur}
        className="size-9 shrink-0 cursor-pointer rounded-md border border-quaternary bg-panel p-1 disabled:opacity-50"
      />
      <Input
        id={id}
        value={asString(value)}
        placeholder="#000000"
        aria-invalid={invalid}
        disabled={disabled}
        onChange={(event) => {
          onChange(event.target.value)
        }}
        onBlur={onBlur}
        className="font-mono"
      />
    </div>
  )
}

export function ImageControl({ id, value, onChange, onBlur, invalid, disabled }: FieldControlProps) {
  return (
    <ImageUploader
      id={id}
      value={asString(value)}
      aria-invalid={invalid}
      disabled={disabled}
      onChange={onChange}
      onBlur={onBlur}
    />
  )
}


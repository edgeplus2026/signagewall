import type { Field } from '@edge/apps-contract'

import { Field as FieldRow, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { FIELD_CONTROLS, INLINE_FIELD_TYPES } from '@/features/apps/config-form/fieldRegistry'

interface FieldRendererProps {
  field: Field
  value: unknown
  error?: string | undefined
  onChange: (value: unknown) => void
  onBlur: () => void
  disabled?: boolean | undefined
}

export function FieldRenderer({ field, value, error, onChange, onBlur, disabled }: FieldRendererProps) {
  const Control = FIELD_CONTROLS[field.type]
  const inline = INLINE_FIELD_TYPES.has(field.type)
  const id = `cfg-${field.key}`
  const invalid = Boolean(error)
  const errorList = error ? [{ message: error }] : []

  const controlNode = (
    <Control
      field={field}
      id={id}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      invalid={invalid}
      disabled={disabled}
    />
  )

  if (inline) {
    return (
      <FieldRow orientation="horizontal" data-invalid={invalid}>
        {controlNode}
        <FieldLabel htmlFor={id} className="flex-col items-start gap-0.5">
          <span>{field.label}</span>
          {field.help ? (
            <FieldDescription className="font-normal">{field.help}</FieldDescription>
          ) : null}
        </FieldLabel>
        <FieldError errors={errorList} />
      </FieldRow>
    )
  }

  return (
    <FieldRow data-invalid={invalid}>
      <FieldLabel htmlFor={id}>
        {field.label}
        {field.required ? <span className="text-danger"> *</span> : null}
      </FieldLabel>
      {controlNode}
      {field.help ? <FieldDescription>{field.help}</FieldDescription> : null}
      <FieldError errors={errorList} />
    </FieldRow>
  )
}

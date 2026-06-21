import { buildConfigZod, type ConfigSchema } from '@edge/apps-contract'
import { useMemo, useState } from 'react'

import { FieldGroup } from '@/components/ui/field'
import { FieldRenderer } from '@/features/apps/config-form/FieldRenderer'

type ConfigValues = Record<string, unknown>

interface SchemaFormProps {
  schema: ConfigSchema
  /** Current config values (controlled). */
  value: ConfigValues
  /** Called with the full config on every change — drives live preview + dirty tracking. */
  onChange: (value: ConfigValues) => void
  disabled?: boolean | undefined
}

/**
 * Renders an app's config form from its {@link ConfigSchema}. Validation is
 * derived from the same schema via `buildConfigZod`, so the CMS enforces exactly
 * what the backend validates. Fully controlled: each change is merged and lifted
 * up. Adding a new field type needs no change here — only a new control registry
 * entry.
 */
export function SchemaForm({ schema, value, onChange, disabled }: SchemaFormProps) {
  const zodSchema = useMemo(() => buildConfigZod(schema), [schema])
  // Only surface a field's error once it has been interacted with.
  const [touched, setTouched] = useState<ReadonlySet<string>>(() => new Set())

  const errors = useMemo(() => {
    const map: Record<string, string> = {}
    const result = zodSchema.safeParse(value)
    if (!result.success) {
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? '')
        if (key && !(key in map)) map[key] = issue.message
      }
    }
    return map
  }, [zodSchema, value])

  const markTouched = (key: string) => {
    setTouched((prev) => (prev.has(key) ? prev : new Set(prev).add(key)))
  }

  return (
    <FieldGroup>
      {schema.map((field) => {
        if (field.visibleWhen && value[field.visibleWhen.field] !== field.visibleWhen.equals) {
          return null
        }
        return (
          <FieldRenderer
            key={field.key}
            field={field}
            value={value[field.key]}
            error={touched.has(field.key) ? errors[field.key] : undefined}
            disabled={disabled}
            onChange={(next) => {
              markTouched(field.key)
              onChange({ ...value, [field.key]: next })
            }}
            onBlur={() => {
              markTouched(field.key)
            }}
          />
        )
      })}
    </FieldGroup>
  )
}

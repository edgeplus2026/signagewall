import { buildConfigZod, type ConfigSchema, type Field } from '@edge/apps-contract'
import { useMemo, useState } from 'react'

import { FieldGroup } from '@/components/ui/field'
import { CollapsibleSection } from '@/features/apps/config-form/CollapsibleSection'
import { FieldRenderer } from '@/features/apps/config-form/FieldRenderer'
import { AppSlugProvider } from '@/features/apps/config-form/appSlugContext'

type ConfigValues = Record<string, unknown>

/** The built-in instance-name field, always rendered first. */
const NAME_KEY = '__name__'

/** The instance name, rendered as the first field of the first section. */
export interface NameField {
  value: string
  /** Already-translated label / placeholder / required message (i18n lives in the page). */
  label: string
  placeholder?: string | undefined
  requiredMessage: string
  onChange: (value: string) => void
}

interface SchemaFormProps {
  schema: ConfigSchema
  /** Current config values (controlled). */
  value: ConfigValues
  /** Called with the full config on every change — drives live preview + dirty tracking. */
  onChange: (value: ConfigValues) => void
  /** Instance name, rendered as the first field (above all config fields). */
  nameField?: NameField
  /** The app slug, so the `oauth` control can start the right OAuth flow. */
  appSlug?: string
  disabled?: boolean | undefined
}

/** One rendered group of fields. The first group is untitled and always open. */
interface Section {
  title: string | null
  fields: Field[]
}

/**
 * Group fields into sections by their `section` property, in first-appearance
 * order. The first group is forced untitled (always open); every later named
 * group becomes a collapsible section. Fields without a `section` form the
 * implicit first group.
 */
function groupSections(schema: ConfigSchema): Section[] {
  const order: string[] = []
  const byKey = new Map<string, Field[]>()
  for (const field of schema) {
    const key = field.section ?? ''
    let group = byKey.get(key)
    if (!group) {
      group = []
      byKey.set(key, group)
      order.push(key)
    }
    group.push(field)
  }
  return order.map((key, index) => ({
    // The first group never shows a title (it holds the name + primary fields).
    title: index === 0 ? null : key || null,
    fields: byKey.get(key) ?? [],
  }))
}

/**
 * Renders an app's config form from its {@link ConfigSchema}. Validation is
 * derived from the same schema via `buildConfigZod`, so the CMS enforces exactly
 * what the backend validates. Fully controlled: each change is merged and lifted
 * up. Fields are grouped into sections — the first is untitled and always open
 * (and carries the instance name); the rest are collapsible. Adding a new field
 * type needs no change here — only a new control registry entry.
 */
export function SchemaForm({
  schema,
  value,
  onChange,
  nameField,
  appSlug,
  disabled,
}: SchemaFormProps) {
  // Only surface a field's error once it has been interacted with.
  const [touched, setTouched] = useState<ReadonlySet<string>>(() => new Set())

  const sections = useMemo(() => groupSections(schema), [schema])

  const errors = useMemo(() => {
    const map: Record<string, string> = {}
    // Pass `value` so conditionally-hidden (visibleWhen) fields aren't enforced.
    const result = buildConfigZod(schema, value).safeParse(value)
    if (!result.success) {
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? '')
        if (key && !(key in map)) map[key] = issue.message
      }
    }
    return map
  }, [schema, value])

  const markTouched = (key: string) => {
    setTouched((prev) => (prev.has(key) ? prev : new Set(prev).add(key)))
  }

  const renderField = (field: Field) => {
    const vw = field.visibleWhen
    if (vw && value[vw.field] !== vw.equals) {
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
          // A select option may carry `set` presets that overwrite sibling
          // fields (e.g. a theme that sets background/text colors).
          const preset =
            field.type === 'select'
              ? field.options?.find((option) => option.value === next)?.set
              : undefined
          onChange({ ...value, [field.key]: next, ...preset })
        }}
        onBlur={() => {
          markTouched(field.key)
        }}
      />
    )
  }

  const nameError =
    nameField?.value.trim() === '' ? nameField.requiredMessage : undefined

  return (
    <AppSlugProvider value={appSlug ?? null}>
      <div className="flex flex-col gap-4">
        {sections.map((section, index) => {
          // First (untitled, always-open) section also carries the name field.
          if (index === 0) {
            return (
              <FieldGroup key="primary">
                {nameField ? (
                  <FieldRenderer
                    field={{
                      key: NAME_KEY,
                      type: 'text',
                      label: nameField.label,
                      required: true,
                      ...(nameField.placeholder !== undefined
                        ? { placeholder: nameField.placeholder }
                        : {}),
                    }}
                    value={nameField.value}
                    error={touched.has(NAME_KEY) ? nameError : undefined}
                    disabled={disabled}
                    onChange={(next) => {
                      markTouched(NAME_KEY)
                      nameField.onChange(typeof next === 'string' ? next : '')
                    }}
                    onBlur={() => {
                      markTouched(NAME_KEY)
                    }}
                  />
                ) : null}
                {section.fields.map(renderField)}
              </FieldGroup>
            )
          }

          return (
            <CollapsibleSection key={section.title ?? index} title={section.title ?? ''}>
              <FieldGroup>{section.fields.map(renderField)}</FieldGroup>
            </CollapsibleSection>
          )
        })}
      </div>
    </AppSlugProvider>
  )
}

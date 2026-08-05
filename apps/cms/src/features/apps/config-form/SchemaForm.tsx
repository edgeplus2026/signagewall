import {
  buildConfigZod,
  isFieldVisible,
  type ConfigSchema,
  type Field,
} from '@signagewall/apps-contract'
import { useMemo, useState } from 'react'

import { FieldGroup } from '@/components/ui/field'
import { CollapsibleSection } from '@/features/apps/config-form/CollapsibleSection'
import { FieldRenderer } from '@/features/apps/config-form/FieldRenderer'
import { AppSlugProvider } from '@/features/apps/config-form/appSlugContext'
import { ConfigPatchProvider } from '@/features/apps/config-form/configPatchContext'
import { ConfigValuesProvider } from '@/features/apps/config-form/configValuesContext'
import { InstanceIdProvider } from '@/features/apps/config-form/instanceIdContext'
import { friendlyMessage } from '@/features/apps/config-form/validationMessages'

type ConfigValues = Record<string, unknown>

function valueIdentity(value: unknown): unknown {
  if (value && typeof value === 'object' && 'id' in value) {
    return (value as { id?: unknown }).id
  }
  return value
}

/** Clear every cascading remote picker downstream of a changed parent. */
function clearRemoteDependents(
  schema: ConfigSchema,
  values: ConfigValues,
  changedKey: string,
): ConfigValues {
  const next = { ...values }
  const queue = [changedKey]
  const visited = new Set<string>()

  while (queue.length > 0) {
    const parent = queue.shift()
    if (!parent || visited.has(parent)) continue
    visited.add(parent)

    for (const candidate of schema) {
      if (!Object.values(candidate.remoteParams ?? {}).includes(parent)) continue
      Reflect.deleteProperty(next, candidate.key)
      queue.push(candidate.key)
    }
  }

  return next
}

interface SchemaFormProps {
  schema: ConfigSchema
  /** Current config values (controlled). */
  value: ConfigValues
  /** Called with the full config on every change — drives live preview + dirty tracking. */
  onChange: (value: ConfigValues) => void
  /** The app slug, so the `oauth` control can start the right OAuth flow. */
  appSlug?: string
  /** The instance id, so the `oauth` control can connect/disconnect this instance. */
  instanceId?: string
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
 * up. Fields are grouped into sections — the first is untitled and always open;
 * the rest are collapsible. Adding a new field type needs no change here — only
 * a new control registry entry.
 */
export function SchemaForm({
  schema,
  value,
  onChange,
  appSlug,
  instanceId,
  disabled,
}: SchemaFormProps) {
  // Only surface a field's error once it has been interacted with.
  const [touched, setTouched] = useState<ReadonlySet<string>>(() => new Set())

  const sections = useMemo(() => groupSections(schema), [schema])

  const fieldByKey = useMemo(() => {
    const map = new Map<string, Field>()
    for (const field of schema) map.set(field.key, field)
    return map
  }, [schema])

  const errors = useMemo(() => {
    const map: Record<string, string> = {}
    // Pass `value` so conditionally-hidden (visibleWhen) fields aren't enforced.
    const result = buildConfigZod(schema, value).safeParse(value)
    if (!result.success) {
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? '')
        // Human, field-aware copy instead of raw zod defaults.
        if (key && !(key in map)) map[key] = friendlyMessage(issue, fieldByKey.get(key))
      }
    }
    return map
  }, [schema, value, fieldByKey])

  const markTouched = (key: string) => {
    setTouched((prev) => (prev.has(key) ? prev : new Set(prev).add(key)))
  }

  const renderField = (field: Field) => {
    // Predefined, non-editable fields (e.g. a branded news app's fixed feed URL)
    // are kept in the config but never shown.
    if (field.hidden) {
      return null
    }
    if (!isFieldVisible(field.visibleWhen, value)) {
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
          const merged = { ...value, [field.key]: next, ...preset }
          const parentsChanged = valueIdentity(value[field.key]) !== valueIdentity(next)
          onChange(parentsChanged ? clearRemoteDependents(schema, merged, field.key) : merged)
        }}
        onBlur={() => {
          markTouched(field.key)
        }}
      />
    )
  }

  return (
    <AppSlugProvider value={appSlug ?? null}>
      <InstanceIdProvider value={instanceId ?? null}>
        <ConfigValuesProvider value={value}>
          <ConfigPatchProvider
            value={(patch) => {
              onChange({ ...value, ...patch })
            }}
          >
            <div className="flex flex-col gap-4">
              {sections.map((section, index) => {
                // First (untitled, always-open) section — the primary config fields.
                if (index === 0) {
                  return <FieldGroup key="primary">{section.fields.map(renderField)}</FieldGroup>
                }

                return (
                  <CollapsibleSection key={section.title ?? index} title={section.title ?? ''}>
                    <FieldGroup>{section.fields.map(renderField)}</FieldGroup>
                  </CollapsibleSection>
                )
              })}
            </div>
          </ConfigPatchProvider>
        </ConfigValuesProvider>
      </InstanceIdProvider>
    </AppSlugProvider>
  )
}

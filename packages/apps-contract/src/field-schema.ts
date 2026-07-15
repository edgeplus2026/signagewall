import { z } from 'zod'

/**
 * The set of field types the CMS knows how to render and the backend knows how
 * to validate. Adding a new type means: (1) extend this union, (2) add a zod
 * mapping in {@link buildFieldZod}, (3) add a renderer in the CMS field registry.
 */
export type FieldType =
  | 'text'
  | 'textarea'
  | 'url'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'switch'
  | 'image'
  | 'color'
  | 'oauth'
  /** A place picked via autocomplete; stored as {@link LocationValue}. */
  | 'location'
  /** Rich text authored in a WYSIWYG editor; stored as a sanitized HTML string. */
  | 'richtext'
  /**
   * A date and time chosen from a native picker. Stored as a local ISO string
   * `YYYY-MM-DDTHH:MM` (no timezone — it is the screen's local wall time).
   */
  | 'datetime'
  /**
   * A repeating list of rows, each row a small set of typed sub-fields declared
   * in {@link Field.fields}. Stored as an array of objects (`Array<Record<string,
   * unknown>>`). The CMS renders an add/remove/reorder editor; the backend
   * validates every row against `fields`. Replaces the "one item per line"
   * textarea MVP used by list apps (menu, ticker, world clocks, stocks).
   */
  | 'repeater'
  /**
   * A resource picked from a connected account via an async, searchable
   * dropdown (the CMS queries a backend "browse" endpoint as the user types).
   * Stored as {@link RemoteSelectValue}. Which endpoint to query is named by the
   * field's {@link Field.remoteSource}. Used by `connected` apps (e.g. Canva).
   */
  | 'remote-select'

/**
 * The value a `location` field stores: a resolved place with coordinates (from
 * the CMS autocomplete). A bare string is also accepted for backward
 * compatibility — a city name the backend geocodes.
 */
export interface LocationValue {
  /** Human label, e.g. "Tres Arroyos, Argentina". */
  label?: string
  lat: number
  lng: number
}

/**
 * The value a `remote-select` field stores: the chosen resource's stable id plus
 * a human label (so the CMS can show the selection without re-fetching). The
 * backend connector uses {@link id} to fetch; {@link label} is display-only.
 */
export interface RemoteSelectValue {
  id: string
  label?: string
}

export interface FieldOption {
  label: string
  value: string
  /**
   * Sibling field values applied when this option is chosen (a preset). E.g. a
   * `theme` select whose "Dark" option sets `backgroundColor`/`textColor` —
   * picking it overwrites those fields. Purely a CMS form convenience; the
   * backend ignores it (the resulting values are validated like any other).
   */
  set?: Record<string, unknown>
}

/** Show a field only when another field has a given value. */
export interface FieldVisibility {
  field: string
  equals: string | number | boolean
}

export interface FieldValidation {
  /** RegExp source string, applied to text-like fields. */
  pattern?: string
  /** Min length (text) / min value (number) / min selected (multiselect). */
  min?: number
  /** Max length (text) / max value (number) / max selected (multiselect). */
  max?: number
}

/**
 * One configurable field in an app's config form. This is the contract shared
 * by the CMS (renders the form), the backend (validates the saved config) and
 * the player (reads typed config).
 */
export interface Field {
  /** Stable key the value is stored under in the instance config. */
  key: string
  type: FieldType
  label: string
  /**
   * Optional form section this field belongs to. Fields are grouped by section
   * in first-appearance order. The first group renders untitled and always open
   * (it holds the primary fields + the instance name); every later named section
   * renders with its title as a collapsible block, collapsed by default. Purely
   * presentational — the backend ignores it when validating config.
   */
  section?: string
  /** Helper / legend text shown under the field. */
  help?: string
  required?: boolean
  default?: unknown
  placeholder?: string
  /** For `select` / `multiselect`. */
  options?: FieldOption[]
  /**
   * For `repeater`: the sub-fields of one row. Each row's value is an object
   * keyed by these fields' `key`s. Keep them simple (text / number / select /
   * switch) — they render inline as columns.
   */
  fields?: Field[]
  /**
   * For `remote-select`: names the backend browse endpoint the CMS queries as
   * the user types (e.g. `'canva-designs'`). The backend ignores it on validate.
   */
  remoteSource?: string
  /**
   * For `oauth`: the single connection provider this app authenticates with
   * (e.g. `'canva'`, `'google'`, `'microsoft'`). The CMS offers exactly this
   * provider when connecting an account. The backend ignores it on validate.
   */
  provider?: string
  validation?: FieldValidation
  /** Conditional visibility based on another field's value. */
  visibleWhen?: FieldVisibility
}

/** An app's full config form: an ordered list of fields. */
export type ConfigSchema = Field[]

const STRING_LIKE_TYPES = new Set<FieldType>([
  'text',
  'textarea',
  'color',
  'image',
  'oauth',
  'richtext',
  // A local ISO string from the picker; validated as a (required → non-empty) string.
  'datetime',
])

function buildStringSchema(field: Field): z.ZodString {
  let schema = z.string()
  if (field.validation?.pattern) {
    schema = schema.regex(new RegExp(field.validation.pattern))
  }
  // `required` means non-empty unless an explicit minimum is given.
  const min = field.validation?.min ?? (field.required ? 1 : undefined)
  if (min !== undefined) schema = schema.min(min)
  if (field.validation?.max !== undefined) schema = schema.max(field.validation.max)
  return schema
}

/** Build the zod schema for a single field, including required/optional handling. */
function buildFieldZod(field: Field): z.ZodTypeAny {
  let schema: z.ZodTypeAny

  if (STRING_LIKE_TYPES.has(field.type)) {
    schema = buildStringSchema(field)
  } else if (field.type === 'url') {
    const url = z.string().url()
    // Optional URLs may be left blank.
    schema = field.required ? url : url.or(z.literal(''))
  } else if (field.type === 'number') {
    let num = z.number()
    if (field.validation?.min !== undefined) num = num.min(field.validation.min)
    if (field.validation?.max !== undefined) num = num.max(field.validation.max)
    schema = num
  } else if (field.type === 'checkbox' || field.type === 'switch') {
    schema = z.boolean()
  } else if (field.type === 'select') {
    const values = (field.options ?? []).map((option) => option.value)
    schema = values.length > 0 ? z.enum(values as [string, ...string[]]) : z.string()
  } else if (field.type === 'location') {
    // A resolved place (lat/lng + label) or a bare city string (legacy/geocoded).
    const place = z.object({
      label: z.string().optional(),
      lat: z.number(),
      lng: z.number(),
    })
    schema = field.required
      ? z.union([z.string().min(1), place])
      : z.union([z.string(), place]).optional()
  } else if (field.type === 'remote-select') {
    // A resource picked from a connected account: stable id + display label.
    const resource = z.object({
      id: z.string().min(1),
      label: z.string().optional(),
    })
    schema = field.required ? resource : resource.optional()
  } else if (field.type === 'repeater') {
    // A list of rows, each validated against the sub-field schema. `buildConfigZod`
    // is hoisted, so the mutual recursion (repeater → row schema) is fine.
    let arr = z.array(buildConfigZod(field.fields ?? []))
    const min = field.validation?.min ?? (field.required ? 1 : undefined)
    if (min !== undefined) arr = arr.min(min)
    if (field.validation?.max !== undefined) arr = arr.max(field.validation.max)
    schema = arr
  } else {
    // multiselect
    const values = (field.options ?? []).map((option) => option.value)
    const item = values.length > 0 ? z.enum(values as [string, ...string[]]) : z.string()
    let arr = z.array(item)
    const min = field.validation?.min ?? (field.required ? 1 : undefined)
    if (min !== undefined) arr = arr.min(min)
    if (field.validation?.max !== undefined) arr = arr.max(field.validation.max)
    schema = arr
  }

  if (field.default !== undefined) {
    return schema.default(field.default)
  }
  if (!field.required) {
    return schema.optional()
  }
  return schema
}

/**
 * Compile a {@link ConfigSchema} into a zod object schema for validation.
 *
 * Used by the backend to validate instance config on write and by the CMS to
 * validate the config form, so both sides enforce exactly the same rules.
 *
 * When `values` is passed, fields hidden by their `visibleWhen` condition are
 * not enforced (they pass through as-is) — so a `required` field that's
 * currently hidden by another field's value doesn't block validation. Omit
 * `values` to validate every field unconditionally.
 */
export function buildConfigZod(
  schema: ConfigSchema,
  values?: Record<string, unknown>,
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const field of schema) {
    const hidden =
      values !== undefined &&
      field.visibleWhen !== undefined &&
      values[field.visibleWhen.field] !== field.visibleWhen.equals
    // Hidden conditional field: accept (and keep) its value without enforcing it.
    shape[field.key] = hidden ? z.any().optional() : buildFieldZod(field)
  }
  return z.object(shape)
}

/** Build the default config object from a schema (used when creating instances). */
export function buildDefaultConfig(schema: ConfigSchema): Record<string, unknown> {
  const config: Record<string, unknown> = {}
  for (const field of schema) {
    if (field.default !== undefined) {
      config[field.key] = field.default
    } else if (field.type === 'multiselect' || field.type === 'repeater') {
      config[field.key] = []
    } else if (field.type === 'checkbox' || field.type === 'switch') {
      config[field.key] = false
    }
  }
  return config
}

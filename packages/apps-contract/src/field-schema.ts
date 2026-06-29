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

export interface FieldOption {
  label: string
  value: string
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
 */
export function buildConfigZod(schema: ConfigSchema): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const field of schema) {
    shape[field.key] = buildFieldZod(field)
  }
  return z.object(shape)
}

/** Build the default config object from a schema (used when creating instances). */
export function buildDefaultConfig(schema: ConfigSchema): Record<string, unknown> {
  const config: Record<string, unknown> = {}
  for (const field of schema) {
    if (field.default !== undefined) {
      config[field.key] = field.default
    } else if (field.type === 'multiselect') {
      config[field.key] = []
    } else if (field.type === 'checkbox' || field.type === 'switch') {
      config[field.key] = false
    }
  }
  return config
}

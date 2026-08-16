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
  /**
   * A file uploaded from the operator's computer via a dropzone, stored inline
   * as a base64 `data:` URL string. Which file types are accepted and the size
   * cap are set per-field by {@link Field.accept} / {@link Field.maxSizeMb}.
   */
  | 'file'
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
   * textarea MVP used by list apps (menu, ticker).
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
   * The organization's screens, multi-selected. Stored as an array of screen id
   * strings. The CMS resolves the options from the org's screen list at render
   * time (the manifest cannot know them). Used by `overlay` apps to choose
   * which screens the overlay shows on.
   */
  | 'screens'
  /**
   * Maps columns of a synced spreadsheet (Google Sheets / Excel) onto the app's
   * target item fields. Stored as `Record<targetKey, headerName>`. The CMS
   * fetches the sheet's header row from the connections "tabular headers"
   * endpoint and renders one picker per target declared in
   * {@link Field.columnMapping}. Which sibling fields name the connection /
   * source / file is also declared there, so the control is app-agnostic.
   */
  | 'column-mapping'
  /**
   * A read-only preview of the rows a tabular sync currently produces (from the
   * app's preview-data endpoint), with sync status and a "convert to manual"
   * action. Display-only: stores no value and is skipped by validation.
   */
  | 'tabular-preview'

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

/**
 * Show a field only when another field has a given value (`equals`) or one of
 * several values (`equalsAny`). Exactly one of the two should be set.
 */
export interface FieldVisibility {
  field: string
  equals?: string | number | boolean
  equalsAny?: (string | number | boolean)[]
}

/** True when `visibleWhen` is satisfied by the current form values. */
export function isFieldVisible(
  visibleWhen: FieldVisibility | undefined,
  values: Record<string, unknown>,
): boolean {
  if (!visibleWhen) return true
  const actual = values[visibleWhen.field]
  if (visibleWhen.equalsAny !== undefined) {
    return visibleWhen.equalsAny.some((candidate) => candidate === actual)
  }
  return actual === visibleWhen.equals
}

/** One target field a spreadsheet column can be mapped onto. */
export interface ColumnMappingTarget {
  key: string
  label: string
  required?: boolean
}

/**
 * Declares how a `column-mapping` field finds its context inside the same
 * config form: which sibling holds the connection, which select chooses the
 * source kind, and which sibling holds the picked file per source kind. Keeping
 * these as declarations (not hardcoded keys) lets any app reuse the control.
 */
export interface ColumnMappingSpec {
  targets: ColumnMappingTarget[]
  /** Sibling `oauth` field key holding the connection id. */
  connectionKey: string
  /** Sibling `select` field key choosing the tabular source kind. */
  sourceKey: string
  /** Sibling `remote-select` field key holding the picked file, per source kind. */
  fileKeyBySource: Record<string, string>
  /** Sibling field key naming the worksheet/tab, when the source has one. */
  worksheetKey?: string
  /**
   * Sibling `repeater` field key holding the manual rows. Used by the
   * `tabular-preview` control's "convert to manual" action to know where the
   * synced rows should be copied.
   */
  itemsKey?: string
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
  /**
   * Never rendered in the CMS form. The value is still kept in the config (its
   * `default` applies and it is validated), so this is how an app ships a
   * predefined value the operator must not edit — e.g. a fixed feed URL on a
   * branded news app built from the generic RSS app.
   */
  hidden?: boolean
  default?: unknown
  placeholder?: string
  /** For `select` / `multiselect`. */
  options?: FieldOption[]
  /**
   * For `select`: render as a searchable combobox instead of a plain dropdown.
   * Use it when the option list is long (currencies, timezones). Purely a CMS
   * form convenience — the backend ignores it when validating config.
   * (`multiselect` is always searchable and doesn't need this.)
   */
  searchable?: boolean
  /**
   * For `select`: render the options as a gallery of preview thumbnails instead
   * of a dropdown, so the operator SEES each design before choosing it. Use it
   * for fields that pick a look (a layout, a face, a design) — a text label can
   * only ever describe a picture, and "Chalkboard. A hand-written café board"
   * still has to be applied before anyone knows what it is.
   *
   * The value is the preview NAMESPACE: images are served from
   * `${appsBase}/_previews/<namespace>/<option value>.webp`. It is a namespace
   * rather than the app slug because several apps share ONE renderer and must
   * therefore share one set of images — the seven branded RSS presets all
   * render through `rss`, and Instagram/Facebook/LinkedIn/Teams all through
   * `embeds/_shared/social-feed.ts`.
   *
   * The images are generated from the real bundles by
   * `packages/apps/scripts/build-previews.mts` and committed under
   * `packages/apps/previews/`. A missing one degrades to a label-only card, so
   * marking a field before its thumbnails exist is safe.
   *
   * Purely a CMS form convenience — the backend ignores it when validating
   * config, exactly like {@link Field.searchable}.
   */
  previewGallery?: string
  /**
   * For `select`: render the options as a segmented button group instead of a
   * dropdown, so every choice is visible without opening anything. Use it for a
   * short list (2–4) where the value is a MODE that changes the rest of the form
   * — a dropdown hides the alternatives behind a click and reads as a value, not
   * a switch. Purely a CMS form convenience; the backend ignores it.
   */
  buttonGroup?: boolean
  /**
   * For `repeater`: edit the rows in a wide modal instead of inline in the
   * config sidebar. The sidebar is ~384px, so a row with several columns
   * (name / price / description / category / photo) is unusable squeezed into
   * it. The field renders a summary plus an "Edit" button. Purely a CMS form
   * convenience; the stored value is identical either way.
   */
  editor?: 'dialog'
  /**
   * Set on a field to render ITS section expanded on first paint. Named sections
   * are collapsed by default, which is right for optional trimming but wrong for
   * a section holding the app's actual content — an operator should not have to
   * find a disclosure triangle to add their first menu item. Purely a CMS form
   * convenience; the backend ignores it.
   */
  sectionOpen?: boolean
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
  /**
   * For `file`: the accepted file types, as an `<input accept>` value
   * (e.g. `'application/pdf'`). Advisory to the CMS dropzone only; the backend
   * ignores it on validate (the value is validated as a string).
   */
  accept?: string
  /**
   * For `file`: the maximum upload size in megabytes the CMS dropzone accepts
   * before rejecting. Advisory to the CMS only; the backend ignores it.
   */
  maxSizeMb?: number
  validation?: FieldValidation
  /** Conditional visibility based on another field's value. */
  visibleWhen?: FieldVisibility
  /** For `column-mapping`: targets and sibling-field wiring. */
  columnMapping?: ColumnMappingSpec
  /**
   * For `repeater`: offer a client-side "Import CSV" flow that maps CSV columns
   * onto the row sub-fields and writes the rows into the list. Advisory to the
   * CMS only; the backend ignores it.
   */
  csvImport?: boolean
  /**
   * For `oauth`: resolve the connection provider dynamically from another
   * field's value (e.g. a `source` select mapping `gsheets → google`,
   * `excel → microsoft`). Takes precedence over {@link provider} when set.
   * Advisory to the CMS only; the backend ignores it on validate.
   */
  providerFrom?: { field: string; map: Record<string, string> }
}

/** An app's full config form: an ordered list of fields. */
export type ConfigSchema = Field[]

const STRING_LIKE_TYPES = new Set<FieldType>([
  'text',
  'textarea',
  'color',
  'image',
  // A base64 `data:` URL of the uploaded file — validated as a (non-empty when
  // required) string, exactly like `image`.
  'file',
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
    let url = z.string().url()
    // URL fields are text fields too: app manifests use this to reject a valid
    // but wrong-provider URL (e.g. a normal Power BI link or a non-Microsoft
    // PowerPoint page) before it reaches an unattended player.
    if (field.validation?.pattern) {
      url = url.regex(new RegExp(field.validation.pattern))
    }
    if (field.validation?.min !== undefined) {
      url = url.min(field.validation.min)
    }
    if (field.validation?.max !== undefined) {
      url = url.max(field.validation.max)
    }
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
  } else if (field.type === 'screens') {
    // Screen ids are org data, unknowable to the schema — any string array;
    // the backend additionally scopes them to the org when resolving.
    let arr = z.array(z.string().min(1))
    const min = field.validation?.min ?? (field.required ? 1 : undefined)
    if (min !== undefined) arr = arr.min(min)
    if (field.validation?.max !== undefined) arr = arr.max(field.validation.max)
    schema = arr
  } else if (field.type === 'column-mapping') {
    // target key → sheet header name. Required targets are enforced by the CMS
    // control (they need live sheet headers to make sense); the backend only
    // checks the shape.
    const record = z.record(z.string(), z.string())
    schema = field.required ? record : record.optional()
  } else if (field.type === 'tabular-preview') {
    // Display-only; never stores a value.
    schema = z.any().optional()
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
      !isFieldVisible(field.visibleWhen, values)
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
    } else if (
      field.type === 'multiselect' ||
      field.type === 'repeater' ||
      field.type === 'screens'
    ) {
      config[field.key] = []
    } else if (field.type === 'checkbox' || field.type === 'switch') {
      config[field.key] = false
    }
  }
  return config
}

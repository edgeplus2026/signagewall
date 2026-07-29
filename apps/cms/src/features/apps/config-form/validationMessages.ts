import type { Field } from '@signagewall/apps-contract'

/**
 * The subset of a Zod (v4) issue we key friendly messages off. Structural (not
 * the imported issue type) so this module carries no direct zod dependency — the
 * issues from `safeParse(...).error.issues` satisfy it.
 */
export interface ValidationIssue {
  code: string
  /** v4 `too_small`/`too_big`: 'string' | 'number' | 'array' | … */
  origin?: string
  minimum?: number | bigint
  maximum?: number | bigint
  /** v4 `invalid_format`: 'url' | 'email' | … */
  format?: string
  /** v4 `invalid_type`: the expected type. */
  expected?: string
  path: PropertyKey[]
  message: string
}

/** Lowercase the label for mid-sentence use, but leave acronyms/URLs alone. */
function midSentence(label: string): string {
  if (label.length <= 3 || label === label.toUpperCase()) return label
  return label.charAt(0).toLowerCase() + label.slice(1)
}

/**
 * Turn a raw Zod (v4) issue into a human, field-aware message. Zod's defaults
 * ("Too small: expected string to have >=1 characters", "Invalid URL") are
 * unusable in an operator-facing form; this maps the codes we actually emit onto
 * plain, reassuring guidance that names the field. Keep every branch short.
 */
export function friendlyMessage(issue: ValidationIssue, field: Field | undefined): string {
  const label = field?.label ?? 'This field'
  const urlMessage = 'Enter a valid link — it should start with http:// or https://'

  switch (issue.code) {
    case 'invalid_type':
      // A missing value of any typed field lands here.
      if (field?.type === 'url') return urlMessage
      return `${label} is required.`

    case 'invalid_format':
      if (issue.format === 'url') return urlMessage
      if (issue.format === 'email') return 'Enter a valid email address.'
      return `${label} isn't in the expected format.`

    case 'too_small': {
      const min = Number(issue.minimum ?? 0)
      if (issue.origin === 'string') {
        return min <= 1 ? `${label} is required.` : `${label} must be at least ${String(min)} characters.`
      }
      if (issue.origin === 'number') return `${label} must be ${String(min)} or more.`
      if (issue.origin === 'array') {
        if (field?.type === 'repeater') {
          return min <= 1 ? `Add at least one row.` : `Add at least ${String(min)} rows.`
        }
        return min <= 1 ? `Choose at least one option.` : `Choose at least ${String(min)} options.`
      }
      return `${label} is required.`
    }

    case 'too_big': {
      const max = Number(issue.maximum ?? 0)
      if (issue.origin === 'string') return `${label} must be ${String(max)} characters or fewer.`
      if (issue.origin === 'number') return `${label} must be ${String(max)} or less.`
      if (issue.origin === 'array') {
        return field?.type === 'repeater'
          ? `Keep it to ${String(max)} rows at most.`
          : `Choose ${String(max)} options at most.`
      }
      return `${label} is too long.`
    }

    case 'invalid_value':
      // v4 code for a value outside an enum/literal set.
      return `Choose one of the options for ${midSentence(label)}.`

    case 'invalid_union':
      // Optional URL union (url | '') and the location union (place | string).
      if (field?.type === 'url') return urlMessage
      if (field?.type === 'location') return 'Pick a place from the list.'
      return `${label} is required.`

    default:
      return `Please check ${midSentence(label)}.`
  }
}

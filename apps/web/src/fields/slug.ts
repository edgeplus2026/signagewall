import type { TextFieldValidation } from 'payload'

/** One safe URL segment. Route prefixes are owned by next-intl, not the CMS. */
export const validateSlug: TextFieldValidation = (value) => {
  if (value === null || value === undefined || value === '') return true
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
    ? true
    : 'Use lowercase ASCII letters, numbers and single hyphens only.'
}

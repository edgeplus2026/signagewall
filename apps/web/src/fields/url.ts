import type { TextFieldValidation } from 'payload'

function absoluteHttpUrlResult(value: null | string | undefined): string | true {
  if (value === null || value === undefined || value === '') return true
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? true
      : 'URL must use http or https.'
  } catch {
    return 'Use an absolute URL including https://.'
  }
}

export const validateAbsoluteHttpUrl: TextFieldValidation = (value) => absoluteHttpUrlResult(value)

export const validateCanonicalUrl: TextFieldValidation = (value) => {
  const absoluteUrlResult = absoluteHttpUrlResult(value)
  if (absoluteUrlResult !== true || !value) return absoluteUrlResult

  const url = new URL(value)
  if (url.hash) return 'Canonical URLs must not include a fragment.'
  if (url.username || url.password) return 'Canonical URLs must not include credentials.'
  return true
}

export const CONTENT_REDIRECT_STATUS_CODES = [307, 308] as const

export type ContentRedirectStatus = (typeof CONTENT_REDIRECT_STATUS_CODES)[number]

/**
 * Canonical representation for an internal redirect path.
 *
 * Editors may paste `apps/clock/`; storage and lookup both resolve that to
 * `/apps/clock`. External URLs, protocol-relative URLs, queries and fragments
 * remain invalid because redirect records describe only an internal pathname.
 */
export function normaliseRedirectPath(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed || trimmed.startsWith('//') || trimmed.includes('?') || trimmed.includes('#')) {
    return null
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(trimmed) || trimmed.includes('\\')) return null

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return withLeadingSlash === '/' ? '/' : withLeadingSlash.replace(/\/+$/, '')
}

export function contentRedirectStatus(value: unknown): ContentRedirectStatus {
  return value === '307' || value === 307 ? 307 : 308
}

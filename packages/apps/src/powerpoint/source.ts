/** The two ways a PowerPoint instance can obtain its presentation. */
export const POWERPOINT_SOURCE_EMBED = 'embed' as const
export const POWERPOINT_SOURCE_MICROSOFT = 'microsoft' as const

export type PowerPointSource =
  | typeof POWERPOINT_SOURCE_EMBED
  | typeof POWERPOINT_SOURCE_MICROSOFT

/** Minimal shape needed to infer the mode; no catch-all index is required. */
export interface PowerPointSourceConfig {
  source?: unknown
  connectionId?: unknown
  presentation?: unknown
}

/**
 * Hosts used by Microsoft-generated PowerPoint embed URLs. Keep this narrower
 * than the generic Web app: this field is specifically for a public Office
 * viewer, not an arbitrary page that could navigate or behave like a kiosk.
 */
const SHAREPOINT_SUFFIXES = [
  '.sharepoint.com',
  '.sharepoint.us',
  '.sharepoint.de',
  '.sharepoint.cn',
  '.sharepoint-mil.us',
] as const

/**
 * Schema-level guard for the config form/backend. Runtime validation below is
 * authoritative and case-insensitive; copied Microsoft URLs use lowercase
 * hosts, so this also gives the operator an immediate form error for other
 * sites instead of accepting a generic web URL.
 */
export const POWERPOINT_EMBED_URL_PATTERN =
  '^https://(?:(?:(?:[A-Za-z0-9-]+\\.)*sharepoint\\.(?:com|us|de|cn)|(?:[A-Za-z0-9-]+\\.)*sharepoint-mil\\.us|(?:[A-Za-z0-9-]+\\.)*officeapps\\.live\\.com)/.+|onedrive\\.live\\.com/embed(?:[/?#].*)?)$'

/**
 * Resolve source mode while preserving v2 instances, which predate `source`.
 * A legacy connection/presentation is Microsoft mode; an untouched/new
 * instance defaults to the no-account embed flow.
 */
export function resolvePowerPointSource(
  config: PowerPointSourceConfig,
): PowerPointSource {
  if (config.source === POWERPOINT_SOURCE_EMBED) {
    return POWERPOINT_SOURCE_EMBED
  }
  if (config.source === POWERPOINT_SOURCE_MICROSOFT) {
    return POWERPOINT_SOURCE_MICROSOFT
  }

  const presentation = config.presentation
  const presentationId =
    presentation &&
    typeof presentation === 'object' &&
    'id' in presentation &&
    typeof presentation.id === 'string'
      ? presentation.id.trim()
      : ''
  if (
    (typeof config.connectionId === 'string' && config.connectionId.trim()) ||
    presentationId
  ) {
    return POWERPOINT_SOURCE_MICROSOFT
  }
  return POWERPOINT_SOURCE_EMBED
}

/** True for a Microsoft host that serves Office/PowerPoint embed viewers. */
function isMicrosoftEmbedHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  return (
    host === 'onedrive.live.com' ||
    host === 'officeapps.live.com' ||
    host.endsWith('.officeapps.live.com') ||
    SHAREPOINT_SUFFIXES.some(
      (suffix) => host === suffix.slice(1) || host.endsWith(suffix),
    )
  )
}

/**
 * Normalize an operator-pasted PowerPoint embed URL. Microsoft emits `&amp;`
 * inside its iframe HTML; accepting that encoded separator makes it safe to
 * paste the iframe's `src` value verbatim. Returns null for non-HTTPS or
 * non-Microsoft URLs.
 */
export function normalizePowerPointEmbedUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const raw = value.trim().replace(/&amp;/gi, '&')
  if (!raw) return null

  try {
    const parsed = new URL(raw)
    if (
      parsed.protocol !== 'https:' ||
      parsed.username ||
      parsed.password ||
      !isMicrosoftEmbedHost(parsed.hostname)
    ) {
      return null
    }

    // Personal OneDrive's ordinary share page refuses framing; its generated
    // PowerPoint embed always uses `/embed`. SharePoint/Office viewer paths vary
    // by tenant/cloud, so their host check is the stable boundary.
    if (parsed.hostname.toLowerCase() === 'onedrive.live.com') {
      const path = parsed.pathname.toLowerCase()
      if (path !== '/embed' && !path.startsWith('/embed/')) return null
    }
    return parsed.toString()
  } catch {
    return null
  }
}

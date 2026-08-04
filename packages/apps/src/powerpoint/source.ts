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
  '^https://(?:(?:(?:[A-Za-z0-9-]+\\.)*sharepoint\\.(?:com|us|de|cn)|(?:[A-Za-z0-9-]+\\.)*sharepoint-mil\\.us|(?:[A-Za-z0-9-]+\\.)*officeapps\\.live\\.com)/.+|onedrive\\.live\\.com/(?:embed(?:[/?#].*)?|\\?(?=[^#]*(?:resid|id)=)[^#]+)|1drv\\.ms/p/c/[^/?#]+/[^/?#]+(?:\\?[^#]*)?(?:#.*)?)$'

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
    host === '1drv.ms' ||
    host === 'onedrive.live.com' ||
    host === 'officeapps.live.com' ||
    host.endsWith('.officeapps.live.com') ||
    SHAREPOINT_SUFFIXES.some(
      (suffix) => host === suffix.slice(1) || host.endsWith(suffix),
    )
  )
}

/**
 * Newer personal-OneDrive PowerPoint embed codes use a 1drv.ms URL rather than
 * onedrive.live.com/embed. It is safe to accept the precise `/p/c/<cid>/<item>`
 * shape copied by PowerPoint, while continuing to reject ordinary `/p/s!...`
 * sharing shortcuts that may be private or lead to an editor page.
 */
function isOneDrivePowerPointEmbedPath(pathname: string): boolean {
  const parts = pathname.split('/').filter(Boolean)
  return (
    parts.length === 4 &&
    parts[0]?.toLowerCase() === 'p' &&
    parts[1]?.toLowerCase() === 'c' &&
    Boolean(parts[2]) &&
    Boolean(parts[3])
  )
}

/**
 * Extract `src` when Microsoft copied a complete iframe. PowerPoint for the web
 * exposes an "Embed code" copy button, not a second button that copies only the
 * URL, so making the operator manually edit HTML is needlessly fragile.
 */
function extractIframeSrc(value: string): string {
  const markup = value
    .trim()
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
  if (!/<iframe\b/i.test(markup)) return markup

  const match = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(markup)
  return (match?.[1] ?? match?.[2] ?? match?.[3] ?? '').trim()
}

/** Decode the URL entities Microsoft emits inside an HTML attribute. */
function decodeUrlEntities(value: string): string {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&#0*38;/gi, '&')
    .replace(/&#x0*26;/gi, '&')
}

/** Read a query parameter without relying on the provider's key casing. */
function queryValue(url: URL, key: string): string | null {
  const wanted = key.toLowerCase()
  for (const [name, value] of url.searchParams) {
    if (name.toLowerCase() === wanted) return value
  }
  return null
}

/**
 * Normalize an operator-pasted PowerPoint source. Accepts a bare Microsoft URL
 * or the complete iframe copied by PowerPoint. Public SharePoint share links
 * are switched to Office's read-only embed view; personal OneDrive links with
 * a stable item id are switched to `/embed`. PowerPoint's newer generated
 * `1drv.ms/p/c/<cid>/<item>` iframe source is already an embed URL and is kept
 * as-is; ordinary shortened sharing links remain unsupported.
 */
export function normalizePowerPointEmbedUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const raw = decodeUrlEntities(extractIframeSrc(value))
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

    const hostname = parsed.hostname.toLowerCase()
    if (hostname === '1drv.ms') {
      if (!isOneDrivePowerPointEmbedPath(parsed.pathname)) return null
    } else if (hostname === 'onedrive.live.com') {
      const path = parsed.pathname.toLowerCase()
      if (path !== '/embed' && !path.startsWith('/embed/')) {
        const resid = queryValue(parsed, 'resid') ?? queryValue(parsed, 'id')
        if (!resid) return null
        parsed.pathname = '/embed'
        parsed.searchParams.set('resid', resid)
        parsed.searchParams.delete('id')
      }
    } else if (
      SHAREPOINT_SUFFIXES.some(
        (suffix) =>
          hostname === suffix.slice(1) || hostname.endsWith(suffix),
      )
    ) {
      // A normal public SharePoint presentation link opens the full Office
      // page. `action=embedview` selects the read-only iframe viewer; the public
      // sharing token already present in the URL remains untouched.
      parsed.searchParams.set('action', 'embedview')
      if (!parsed.searchParams.has('wdbipreview')) {
        parsed.searchParams.set('wdbipreview', 'true')
      }
    }
    return parsed.toString()
  } catch {
    return null
  }
}

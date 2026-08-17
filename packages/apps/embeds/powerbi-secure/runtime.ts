import type { SecurePowerBiPayload } from '../../src/powerbi-secure/payload.js'

export interface SecurePowerBiMeta {
  stale?: boolean
  pending?: boolean
}

export type SnapshotFreshness = 'fresh' | 'pending' | 'stale'

export type SecurePowerBiView =
  | {
      kind: 'content'
      payload: SecurePowerBiPayload
      pages: string[]
      freshness: SnapshotFreshness
      exportedLabel: string
    }
  | { kind: 'pending'; message: string }
  | { kind: 'empty'; message: string }
  | { kind: 'error'; message: string }

function string(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Return only authorized, hydrated image refs. Credential-free connector refs
 * intentionally have no URL and are therefore never renderable by the embed.
 */
export function hydratedPageUrls(
  payload: SecurePowerBiPayload | null | undefined,
): string[] {
  if (!payload || !Array.isArray(payload.pages)) return []

  const seen = new Set<string>()
  const pages: string[] = []
  for (const raw of payload.pages) {
    const ref = raw as unknown as Record<string, unknown>
    if (
      ref.kind !== 'private-asset' ||
      !string(ref.key) ||
      !string(ref.version) ||
      !string(ref.mimeType).toLocaleLowerCase().startsWith('image/')
    ) {
      continue
    }

    const candidate = string(ref.url)
    try {
      const parsed = new URL(candidate)
      if (parsed.protocol !== 'https:' || seen.has(candidate)) continue
      seen.add(candidate)
      pages.push(candidate)
    } catch {
      // Safe degradation: never surface the rejected URL or an upstream body.
    }
  }
  return pages
}

/** Keep a prior rendered export while an async refresh is pending or stale. */
export function retainLastKnownGood(
  incoming: SecurePowerBiPayload | null,
  retained: SecurePowerBiPayload | null,
  meta: SecurePowerBiMeta | null,
): SecurePowerBiPayload | null {
  if (hydratedPageUrls(incoming).length > 0) return incoming
  if ((meta?.pending || meta?.stale) && hydratedPageUrls(retained).length > 0) {
    return retained
  }
  return null
}

function exportedLabel(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Last exported time unavailable'
  return `Last exported ${new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)}`
}

/** Pure rendering decision used by the browser runtime and lifecycle fixtures. */
export function snapshotView(
  payload: SecurePowerBiPayload | null,
  meta: SecurePowerBiMeta | null,
): SecurePowerBiView {
  const pages = hydratedPageUrls(payload)
  if (payload && pages.length > 0) {
    const freshness: SnapshotFreshness = meta?.stale
      ? 'stale'
      : meta?.pending
        ? 'pending'
        : 'fresh'
    return {
      kind: 'content',
      payload,
      pages,
      freshness,
      exportedLabel: exportedLabel(payload.exportedAt),
    }
  }
  if (meta?.pending) {
    return {
      kind: 'pending',
      message: 'Preparing the first secure Power BI snapshot…',
    }
  }
  if (meta?.stale) {
    return {
      kind: 'error',
      message:
        'A secure snapshot is not available. Check the connection, permissions and capacity in SignageWall.',
    }
  }
  return {
    kind: 'empty',
    message: 'No exported report pages yet.',
  }
}

export interface SlideshowLifecycle {
  active: boolean
  index: number
  contentKey: string
}

export function contentKey(view: SecurePowerBiView): string {
  if (view.kind !== 'content') return ''
  const immutablePages = view.payload.pages.flatMap((raw) => {
    const ref = raw as unknown as Record<string, unknown>
    const key = string(ref.key)
    const version = string(ref.version)
    return key && version ? [`${version}:${key}`] : []
  })
  return [
    view.payload.sourceVersion ?? '',
    view.payload.exportedAt,
    ...immutablePages,
  ].join('\n')
}

/**
 * Reconcile host activation and new snapshot pagination. A newly-active item or
 * a new export starts from page one; config-only updates retain the current page.
 */
export function reconcileLifecycle(
  previous: SlideshowLifecycle,
  view: SecurePowerBiView,
  active: boolean,
): SlideshowLifecycle {
  const key = contentKey(view)
  const count = view.kind === 'content' ? view.pages.length : 0
  const becameActive = active && !previous.active
  const changed = key !== previous.contentKey
  return {
    active,
    contentKey: key,
    index:
      changed || becameActive || count === 0
        ? 0
        : Math.min(previous.index, count - 1),
  }
}

export function nextPageIndex(index: number, pageCount: number): number {
  if (pageCount < 2) return 0
  return (Math.max(0, index) + 1) % pageCount
}

export function slideDurationMs(value: unknown): number {
  const seconds =
    typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : 12
  return Math.min(120, Math.max(3, seconds)) * 1000
}

export type ViewportShape = 'portrait' | 'square' | 'landscape'

/** Stable responsive branch mirrored by the embed stylesheet breakpoints. */
export function viewportShape(width: number, height: number): ViewportShape {
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 1
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 1
  const ratio = safeWidth / safeHeight
  if (ratio < 0.8) return 'portrait'
  if (ratio > 1.25) return 'landscape'
  return 'square'
}

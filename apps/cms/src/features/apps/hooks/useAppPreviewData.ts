import type { AppDataMeta } from '@edge/apps-contract'
import { useQuery } from '@tanstack/react-query'

import { appsApi } from '@/features/apps/api/appsApi'
import { appsQueryKey } from '@/features/apps/lib/appsQueryKeys'
import type { AppInstanceConfig, EdgeApp } from '@/features/apps/types/app.types'
import { useDebouncedValue } from '@/features/media/stock/hooks/useDebouncedValue'
import { useOrganizationStore } from '@/features/organizations/store/organizationStore'

/** Debounce window before a config edit triggers an upstream preview fetch. */
const PREVIEW_DEBOUNCE_MS = 500

export interface AppPreviewData {
  data: unknown
  meta: AppDataMeta | null
}

/**
 * Resolves the connector payload for a `server` app's live preview, debounced so
 * typing in the config form doesn't fire a request per keystroke. No-op for
 * `static`/`connected` apps (returns no data) — the bundle then renders from
 * config alone. The backend de-dupes on the coarse cache key, so previewing a
 * city/feed that real screens already use is an instant cache hit.
 */
export function useAppPreviewData(
  app: EdgeApp,
  config: AppInstanceConfig,
): AppPreviewData {
  const organizationId = useOrganizationStore(
    (state) => state.activeOrganizationId,
  )
  const isServer = app.dataSource === 'server'
  const debouncedConfig = useDebouncedValue(config, PREVIEW_DEBOUNCE_MS)

  const query = useQuery({
    queryKey: [
      ...appsQueryKey(organizationId),
      'preview-data',
      app.slug,
      debouncedConfig,
    ],
    queryFn: () => appsApi.previewAppData(app.slug, debouncedConfig),
    enabled: Boolean(organizationId) && isServer,
    // Keep the last payload on screen while the next one loads (no flicker).
    placeholderData: (previous) => previous,
    // Connector data is already cached server-side; this just mirrors freshness.
    staleTime: 30_000,
  })

  return {
    data: query.data?.data ?? null,
    meta: query.data?.meta ?? null,
  }
}

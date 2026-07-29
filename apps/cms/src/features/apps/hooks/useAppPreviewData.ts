import type { AppDataMeta } from '@signagewall/apps-contract'
import { useQuery } from '@tanstack/react-query'

import { appsApi } from '@/features/apps/api/appsApi'
import { appsQueryKey } from '@/features/apps/lib/appsQueryKeys'
import type { AppInstanceConfig, CatalogApp } from '@/features/apps/types/app.types'
import { useDebouncedValue } from '@/features/media/stock/hooks/useDebouncedValue'
import { useOrganizationStore } from '@/features/organizations/store/organizationStore'

/** Debounce window before a config edit triggers an upstream preview fetch. */
const PREVIEW_DEBOUNCE_MS = 500

export interface AppPreviewData {
  data: unknown
  meta: AppDataMeta | null
}

/**
 * Resolves the connector payload for a `server` or `connected` app's live
 * preview, debounced so typing in the config form doesn't fire a request per
 * keystroke. No-op for `static` apps, and for `connected` apps until an account
 * is connected (no `connectionId` → nothing to fetch). The backend de-dupes on
 * the cache key, so previewing data real screens already use is an instant hit.
 */
export function useAppPreviewData(
  app: CatalogApp,
  config: AppInstanceConfig,
): AppPreviewData {
  const organizationId = useOrganizationStore(
    (state) => state.activeOrganizationId,
  )
  const isServer = app.dataSource === 'server'
  // `connected` apps preview too, but only once an account is connected.
  const connectionId = config.connectionId
  const isConnectedReady =
    app.dataSource === 'connected' &&
    typeof connectionId === 'string' &&
    connectionId.length > 0
  const debouncedConfig = useDebouncedValue(config, PREVIEW_DEBOUNCE_MS)

  const query = useQuery({
    queryKey: [
      ...appsQueryKey(organizationId),
      'preview-data',
      app.slug,
      debouncedConfig,
    ],
    queryFn: () => appsApi.previewAppData(app.slug, debouncedConfig),
    enabled: Boolean(organizationId) && (isServer || isConnectedReady),
    // Keep the last payload on screen while the next one loads (no flicker).
    placeholderData: (previous) => previous,
    // Connector data is already cached server-side; this just mirrors freshness.
    staleTime: 30_000,
    // While an async upstream job is still running (e.g. a Canva video export),
    // poll so the preview updates the moment the export finishes.
    refetchInterval: (query) =>
      query.state.data?.meta?.pending ? 4_000 : false,
  })

  return {
    data: query.data?.data ?? null,
    meta: query.data?.meta ?? null,
  }
}

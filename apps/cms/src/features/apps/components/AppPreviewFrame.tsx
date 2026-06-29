import type { AppDataMeta } from '@edge/apps-contract'
import { useEffect, useRef } from 'react'

import {
  type AppPreviewHandle,
  mountAppPreview,
} from '@/features/apps/lib/appHostBridge'
import type { AppInstanceConfig } from '@/features/apps/types/app.types'

/** Base path the embed bundles are served from (mirrors the player's config). */
const APPS_BASE = (import.meta.env.VITE_APPS_BASE as string | undefined) ?? '/apps'

interface AppPreviewFrameProps {
  /** App slug → loads `${APPS_BASE}/<slug>/index.html`. */
  slug: string
  /** Live draft config from the form; re-sent to the bundle on every change. */
  config: AppInstanceConfig
  /** Connector payload for `server` apps (from the preview-data endpoint). */
  data?: unknown
  /** Data freshness for `server` apps. */
  meta?: AppDataMeta | null
}

/**
 * Live app preview: mounts the *same* embed bundle the player runs and drives it
 * with the operator's draft config over the shared postMessage handshake. No
 * per-app code — the preview is pixel-identical to playback.
 *
 * The iframe is (re)mounted only when `slug` changes; config/data/meta changes
 * are pushed to the existing bundle, which re-renders idempotently.
 */
export function AppPreviewFrame({ slug, config, data, meta }: AppPreviewFrameProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const handleRef = useRef<AppPreviewHandle | null>(null)

  // Latest props mirrored into a ref (updated in an effect, not during render) so
  // the mount effect can seed config without depending on — and thus re-mounting
  // on — every config edit. Declared first so it refreshes before the mount
  // effect reads it on a slug change.
  const latestRef = useRef({ config, data, meta })
  useEffect(() => {
    latestRef.current = { config, data, meta }
  })

  // (Re)mount the iframe when the slug changes, seeding the current config so a
  // freshly mounted bundle always gets it (even when only the slug changed).
  useEffect(() => {
    const host = hostRef.current
    if (!host) {
      return
    }
    const handle = mountAppPreview(host, { appsBase: APPS_BASE, slug })
    handleRef.current = handle
    const { config: c, data: d, meta: m } = latestRef.current
    handle.postConfig({ config: c, data: d, meta: m ?? null })
    return () => {
      handle.dispose()
      handleRef.current = null
    }
  }, [slug])

  // Push subsequent config/data edits to the (already mounted) bundle.
  useEffect(() => {
    handleRef.current?.postConfig({ config, data, meta: meta ?? null })
  }, [config, data, meta])

  return <div ref={hostRef} className="size-full bg-black" />
}

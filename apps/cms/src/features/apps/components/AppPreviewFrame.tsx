import type { AppDataMeta } from '@signagewall/apps-contract'
import { Volume2Icon, VolumeXIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { ScaledViewport } from '@/components/common/ScaledViewport'
import {
  type AppPreviewHandle,
  mountAppPreview,
} from '@/features/apps/lib/appHostBridge'
import { APPS_BASE } from '@/features/apps/lib/appsBase'
import type { AppInstanceConfig } from '@/features/apps/types/app.types'

interface AppPreviewFrameProps {
  /** App slug → loads `${APPS_BASE}/<slug>/index.html`. */
  slug: string
  /** Live draft config from the form; re-sent to the bundle on every change. */
  config: AppInstanceConfig
  /** Connector payload for `server` apps (from the preview-data endpoint). */
  data?: unknown
  /** Data freshness for `server` apps. */
  meta?: AppDataMeta | null
  /**
   * Whether this app can produce sound (e.g. Live stream, YouTube). When true the
   * preview shows a mute/unmute button so the operator can verify audio; the
   * preview always starts muted.
   */
  audioCapable?: boolean
}

/**
 * Live app preview: mounts the *same* embed bundle the player runs and drives it
 * with the operator's draft config over the shared postMessage handshake. No
 * per-app code — the preview is pixel-identical to playback.
 *
 * The iframe is (re)mounted only when `slug` changes; config/data/meta changes
 * are pushed to the existing bundle, which re-renders idempotently.
 */
export function AppPreviewFrame({
  slug,
  config,
  data,
  meta,
  audioCapable = false,
}: AppPreviewFrameProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const handleRef = useRef<AppPreviewHandle | null>(null)
  // The preview always starts muted; the operator opts into sound per app.
  const [muted, setMuted] = useState(true)

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
    // A new app starts muted regardless of the previous one's state.
    setMuted(true)
    return () => {
      handle.dispose()
      handleRef.current = null
    }
  }, [slug])

  // Push the mute state to the bundle whenever it (or the mounted app) changes.
  useEffect(() => {
    handleRef.current?.setMuted(muted)
  }, [muted, slug])

  // Push subsequent config/data edits to the (already mounted) bundle.
  useEffect(() => {
    handleRef.current?.postConfig({ config, data, meta: meta ?? null })
  }, [config, data, meta])

  // The bundle is mounted into a virtual 1080p viewport, not into however many
  // pixels the preview box happens to be — apps size themselves in `vw`/`vh`, so
  // only a real-resolution viewport renders what the screen will actually show.
  return (
    <div className="relative size-full">
      <ScaledViewport className="bg-black">
        <div ref={hostRef} className="size-full" />
      </ScaledViewport>
      {audioCapable ? (
        <button
          type="button"
          onClick={() => { setMuted((previous) => !previous); }}
          aria-label={muted ? 'Unmute preview' : 'Mute preview'}
          className="absolute right-2 bottom-2 z-10 flex size-8 items-center justify-center rounded-full bg-black/55 text-white ring-1 ring-white/15 backdrop-blur transition-colors hover:bg-black/75"
        >
          {muted ? (
            <VolumeXIcon className="size-4" />
          ) : (
            <Volume2Icon className="size-4" />
          )}
        </button>
      ) : null}
    </div>
  )
}

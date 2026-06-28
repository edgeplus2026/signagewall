import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useAuthStore } from '@/features/auth/store/authStore'
import { useStepDevice } from '@/features/screens/hooks/useScreens'
import { buildPlayerPreviewUrl } from '@/features/screens/lib/playerPreviewUrl'
import type {
  ScreenDeviceOrientation,
  ScreenDeviceScale,
} from '@/features/screens/types/screen.types'

interface PlayerPreviewFrameProps {
  screenId: string
  orientation: ScreenDeviceOrientation
  scale: ScreenDeviceScale
}

/**
 * A live preview of what the paired display is currently playing, shown inside
 * the same wall-mounted signage panel as the pairing frame. It embeds the real
 * player app in preview mode (`?preview=1`), so it mirrors the actual content,
 * orientation and scale of the device rather than a re-implemented mock. The
 * player connects as a read-only spectator authorized by the operator's access
 * token — it never registers as a device, so opening this never disturbs the
 * real display's presence. The preview is always muted.
 *
 * The panel itself always stays landscape (16:9) — it represents the physical
 * device, which is mounted landscape. When the screen's *content* is portrait,
 * the player rotates the content inside this same panel (driven live over the
 * socket), exactly as the real display does.
 *
 * Orientation/scale are passed in the URL only as the initial seed; live
 * changes arrive over the realtime command channel, so the iframe is NOT keyed
 * on them (re-keying would remount and flash the player on every change).
 *
 * The back/next controls don't scrub the preview locally — they issue a remote
 * step command to the real device, which the preview then mirrors in lockstep.
 */
export function PlayerPreviewFrame({
  screenId,
  orientation,
  scale,
}: PlayerPreviewFrameProps) {
  const { t } = useTranslation()
  const token = useAuthStore((state) => state.token)
  const step = useStepDevice()

  if (!token) {
    return null
  }

  const src = buildPlayerPreviewUrl({ screenId, token, orientation, scale })

  const onStep = (direction: 'next' | 'prev') => {
    step.mutate({ id: screenId, direction })
  }

  return (
    // `isolate` confines the bezel/control z-indexes to this subtree so they
    // never stack above the app's sticky header (which sits at z-10).
    <div className="isolate flex flex-col items-center gap-2">
      <div className="relative w-full max-w-lg rounded-2xl bg-linear-to-b from-neutral-800 to-neutral-950 p-2 shadow-[0_30px_70px_-25px_rgba(0,0,0,0.75)] ring-1 ring-white/10 sm:p-2.5">
        {/* machined bezel highlight */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 rounded-2xl ring-1 ring-inset ring-white/5"
        />

        {/* Glass panel: always landscape — it represents the physical display. */}
        <div className="relative aspect-video overflow-hidden rounded-lg bg-black ring-1 ring-black/60 ring-inset">
          <iframe
            src={src}
            title={t('screens.device.preview.frameTitle')}
            allow="autoplay; fullscreen"
            className="absolute inset-0 h-full w-full border-0"
          />

          {/* Remote step controls — drive the real device, preview mirrors it. */}
          <button
            type="button"
            aria-label={t('screens.device.preview.previous')}
            onClick={() => {
              onStep('prev')
            }}
            disabled={step.isPending}
            className="absolute top-1/2 left-2 z-20 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-sm transition hover:bg-black/60 hover:text-white disabled:opacity-50"
          >
            <ChevronLeftIcon className="size-5" />
          </button>
          <button
            type="button"
            aria-label={t('screens.device.preview.next')}
            onClick={() => {
              onStep('next')
            }}
            disabled={step.isPending}
            className="absolute top-1/2 right-2 z-20 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-sm transition hover:bg-black/60 hover:text-white disabled:opacity-50"
          >
            <ChevronRightIcon className="size-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

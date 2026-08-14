import { MonitorPlayIcon } from 'lucide-react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { ScaledViewport } from '@/components/common/ScaledViewport'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { usePlayerPreviewToken } from '@/features/screens/hooks/usePlayerPreviewToken'
import { useScreenDevice } from '@/features/screens/hooks/useScreens'
import {
  buildContentPreviewUrl,
  type PlayerPreviewTarget,
} from '@/features/screens/lib/playerPreviewUrl'
import type {
  ScreenDeviceOrientation,
  ScreenDeviceScale,
} from '@/features/screens/types/screen.types'

interface ContentPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The playlist or screen to play. */
  target: PlayerPreviewTarget | null
  /** Name of the previewed playlist/screen, shown as the dialog title. */
  name?: string
  /**
   * Number of items the target holds, when the caller knows it. Zero renders the
   * empty state instead of a player sitting on a black rectangle with nothing to
   * explain it.
   */
  itemCount?: number
}

/**
 * Plays a playlist or a screen through the *real* player, embedded in a modal.
 *
 * Everything on screen is produced by the player itself, against the same
 * snapshot a device receives — so an operator previewing content sees the
 * genuine article (app bundles, scaling, transitions, item durations) rather
 * than a CMS re-implementation of it that can drift.
 *
 * Deliberately a modest, fixed-size panel and not a full-screen stage: this is a
 * preview, and one that fills the window invites people to leave it open and use
 * the CMS as a display. Pairing a real player is one click away in the screen's
 * device tab for that.
 *
 * It plays the SAVED content — the editor's unsaved edits are not in the
 * snapshot the backend resolves, so they only appear here once saved.
 */
export function ContentPreviewDialog({
  open,
  onOpenChange,
  target,
  name,
  itemCount,
}: ContentPreviewDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-3 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">
            {name ?? t('common.preview.title')}
          </DialogTitle>
          <DialogDescription>
            {t('common.preview.description')}
          </DialogDescription>
        </DialogHeader>

        {/* Keyed on the target so reopening on a different playlist/screen
            mounts a fresh frame rather than reusing one still connected to the
            previous one. */}
        {target?.kind === 'screen' ? (
          <ScreenPreviewStage
            key={target.screenId}
            screenId={target.screenId}
            itemCount={itemCount}
          />
        ) : target ? (
          <PreviewStage
            key={target.playlistId}
            target={target}
            itemCount={itemCount}
            ready
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

/**
 * A screen previews with its display's own orientation and scale, so a portrait
 * screen shows rotated exactly as it plays. Those ride in the iframe URL, so the
 * frame waits for the device query rather than mounting on defaults and
 * remounting the player mid-boot when the real settings land.
 */
function ScreenPreviewStage({
  screenId,
  itemCount,
}: {
  screenId: string
  itemCount: number | undefined
}) {
  const { data: device, isLoading } = useScreenDevice(screenId)

  return (
    <PreviewStage
      target={{ kind: 'screen', screenId }}
      itemCount={itemCount}
      ready={!isLoading}
      orientation={device?.settings?.orientation}
      scale={device?.settings?.scale}
    />
  )
}

function PreviewStage({
  target,
  itemCount,
  ready,
  orientation,
  scale,
}: {
  target: PlayerPreviewTarget
  itemCount: number | undefined
  /** False while the display settings that seed the URL are still loading. */
  ready: boolean
  orientation?: ScreenDeviceOrientation | undefined
  scale?: ScreenDeviceScale | undefined
}) {
  const { t } = useTranslation()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const token = usePlayerPreviewToken(iframeRef)

  return (
    // `isolate` confines the bezel's z-index to this subtree so it never stacks
    // above anything the dialog draws over it.
    <div className="isolate w-full rounded-2xl bg-linear-to-b from-neutral-800 to-neutral-950 p-2 shadow-[0_30px_70px_-25px_rgba(0,0,0,0.75)] ring-1 ring-white/10">
      {/* Glass panel: always landscape — it stands in for the physical display,
          which is mounted landscape even when its content is portrait. */}
      <div className="relative aspect-video overflow-hidden rounded-lg bg-black ring-1 ring-black/60 ring-inset">
        {itemCount === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-white/70">
            <MonitorPlayIcon className="size-8 opacity-60" strokeWidth={1.25} />
            <p className="text-xs">{t('common.preview.empty')}</p>
          </div>
        ) : ready && token ? (
          // The player runs in a virtual 1080p viewport scaled down to fit — not
          // in the few hundred pixels this panel is actually wide. Apps size
          // themselves in `vw`/`vh`, so only a real-resolution viewport mirrors
          // what the display shows.
          <ScaledViewport>
            <iframe
              ref={iframeRef}
              src={buildContentPreviewUrl(target, { orientation, scale })}
              title={t('common.preview.frameTitle')}
              allow="autoplay; fullscreen"
              // Origin-only, not `no-referrer`: the player URL still never leaks
              // (a cross-origin destination sees `https://app…/` and nothing
              // more), but WebKit applies this policy to everything the embedded
              // player then loads — and `no-referrer` there left the YouTube app
              // inside the preview with no Referer, which it rejects (error 153).
              referrerPolicy="strict-origin-when-cross-origin"
              className="size-full border-0"
            />
          </ScaledViewport>
        ) : null}
      </div>
    </div>
  )
}

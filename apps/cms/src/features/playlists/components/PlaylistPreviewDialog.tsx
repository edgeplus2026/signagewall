import {
  AppWindowIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ImageIcon,
  PauseIcon,
  PlayIcon,
  VideoIcon,
  XIcon,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ScaledViewport } from '@/components/common/ScaledViewport'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { AppPreviewFrame } from '@/features/apps/components/AppPreviewFrame'
import { useAppPreviewData } from '@/features/apps/hooks/useAppPreviewData'
import type { AppInstance, CatalogApp } from '@/features/apps/types/app.types'
import { useContentMetadata } from '@/features/content/hooks/useContentMetadata'
import type { ContentDraftItem } from '@/features/content/types/contentDraft.types'
import type { MediaItem } from '@/features/media/types/media.types'
import { cn } from '@/lib/utils'

/** Resolved metadata shape for an app draft item (see `appContentType`). */
interface AppMeta {
  instance: AppInstance
  app: CatalogApp | undefined
}

/**
 * Extra time (ms) added to a video's configured duration before the fallback
 * timer force-advances. The natural `ended` event should win under normal
 * playback; this only fires if the video stalls and never ends or errors.
 */
const VIDEO_FALLBACK_BUFFER_MS = 5_000

interface PlaylistPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Live editor draft — the preview plays these in array order (unsaved edits included). */
  draftItems: ContentDraftItem[]
  playlistName?: string
}

/**
 * Plays the playlist's current draft as a slideshow — a lightweight, in-CMS
 * mirror of what a screen shows: each enabled item is displayed in order for its
 * configured duration (videos advance when they finish), images/videos rendered
 * the same way the media detail view does and apps rendered via the shared
 * embed bundle. It reads the live `draftItems`, so reordering, enable/disable
 * toggles and duration edits are reflected without saving first.
 *
 * The player lives in `PreviewStage`, mounted only while the dialog is open, so
 * playback state resets cleanly every time the preview is reopened.
 */
export function PlaylistPreviewDialog({
  open,
  onOpenChange,
  draftItems,
  playlistName,
}: PlaylistPreviewDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'flex h-screen w-screen max-w-none flex-col items-center justify-center gap-0 rounded-none border-0 bg-black p-0 ring-0 sm:max-w-none',
        )}
      >
        <DialogTitle className="sr-only">
          {t('playlists.preview.title', { name: playlistName ?? '' })}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {t('playlists.preview.description')}
        </DialogDescription>

        {/* Custom close styled for the dark stage (the default sits low-contrast on black). */}
        <DialogClose asChild>
          <button
            type="button"
            aria-label={t('playlists.preview.close')}
            className="absolute top-4 right-4 z-30 flex size-9 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-sm transition hover:bg-black/60 hover:text-white"
          >
            <XIcon className="size-5" />
          </button>
        </DialogClose>

        <PreviewStage draftItems={draftItems} />
      </DialogContent>
    </Dialog>
  )
}

/** The slideshow itself — mounted only while the preview is open. */
function PreviewStage({ draftItems }: { draftItems: ContentDraftItem[] }) {
  const { t } = useTranslation()
  const { resolveMeta } = useContentMetadata(draftItems)

  // Enabled items with something to render, in play order. Disabled items are
  // skipped exactly as `getDraftTotalDuration` skips them.
  const playable = useMemo(
    () =>
      draftItems.filter(
        (item) =>
          !item.disabled &&
          ((item.type === 'media' && Boolean(item.mediaId)) ||
            (item.type === 'app' && Boolean(item.appInstanceId))),
      ),
    [draftItems],
  )

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)

  // Clamp in render so the index stays valid even if the playable list shrinks.
  const safeIndex = currentIndex < playable.length ? currentIndex : 0
  const current = playable[safeIndex]
  const currentMeta = current ? resolveMeta(current) : null
  const isVideo = current?.type === 'media' && (currentMeta as MediaItem | null)?.type === 'video'

  const goNext = useCallback(() => {
    setCurrentIndex((index) => (playable.length === 0 ? 0 : (index + 1) % playable.length))
  }, [playable.length])

  const goPrev = useCallback(() => {
    setCurrentIndex((index) =>
      playable.length === 0 ? 0 : (index - 1 + playable.length) % playable.length,
    )
  }, [playable.length])

  // Auto-advance. Images/apps dwell for their configured duration; videos are
  // driven by their own `ended`/`error` handlers, so here they only get a
  // generous safety-net timer in case playback stalls without either firing.
  useEffect(() => {
    if (!isPlaying || !current) {
      return
    }
    const baseMs = Math.max(1, current.duration) * 1000
    const delay = isVideo ? baseMs + VIDEO_FALLBACK_BUFFER_MS : baseMs
    const timer = window.setTimeout(goNext, delay)
    return () => {
      window.clearTimeout(timer)
    }
  }, [isPlaying, current, safeIndex, isVideo, goNext])

  // Keyboard controls (Escape/close is handled by the dialog itself).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        goNext()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goPrev()
      } else if (event.key === ' ' || event.code === 'Space') {
        event.preventDefault()
        setIsPlaying((playing) => !playing)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [goNext, goPrev])

  if (playable.length === 0 || !current) {
    return (
      <div className="flex flex-col items-center gap-2 text-center text-white/70">
        <VideoIcon className="size-10 opacity-60" strokeWidth={1.25} />
        <p className="text-sm">{t('playlists.preview.empty')}</p>
      </div>
    )
  }

  return (
    <>
      {/* 16:9 stage, centered and as large as fits. Each slide provides its own
          1080p ScaledViewport so it renders as a true screen miniature. */}
      <div className="relative aspect-video w-full max-w-[calc(100vh*16/9)]">
        {current.type === 'app' ? (
          <AppSlide key={current.clientId} meta={currentMeta as AppMeta | null} />
        ) : (
          <MediaSlide
            key={current.clientId}
            meta={currentMeta as MediaItem | null}
            isPlaying={isPlaying}
            onAdvance={goNext}
          />
        )}
      </div>

      {playable.length > 1 && (
        <>
          <button
            type="button"
            aria-label={t('playlists.preview.previous')}
            onClick={goPrev}
            className="absolute top-1/2 left-4 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-sm transition hover:bg-black/60 hover:text-white"
          >
            <ChevronLeftIcon className="size-5" />
          </button>
          <button
            type="button"
            aria-label={t('playlists.preview.next')}
            onClick={goNext}
            className="absolute top-1/2 right-4 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-sm transition hover:bg-black/60 hover:text-white"
          >
            <ChevronRightIcon className="size-5" />
          </button>
        </>
      )}

      {/* Playback bar: play/pause + position counter. */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-center gap-4 bg-linear-to-t from-black/60 to-transparent p-4">
        <button
          type="button"
          aria-label={isPlaying ? t('playlists.preview.pause') : t('playlists.preview.play')}
          onClick={() => {
            setIsPlaying((playing) => !playing)
          }}
          className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        >
          {isPlaying ? <PauseIcon className="size-5" /> : <PlayIcon className="size-5" />}
        </button>
        <span className="text-sm text-white/80 tabular-nums">
          {t('playlists.preview.counter', {
            current: safeIndex + 1,
            total: playable.length,
          })}
        </span>
      </div>
    </>
  )
}

/** Image/video slide, rendered inside a 1080p viewport (mirrors `MediaPreview`). */
function MediaSlide({
  meta,
  isPlaying,
  onAdvance,
}: {
  meta: MediaItem | null
  isPlaying: boolean
  onAdvance: () => void
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  // Videos read `fileUrl` for the <video>; images fall back through thumbnail.
  const previewUrl = meta?.fileUrl ?? meta?.thumbnailUrl

  // Mirror the global play/pause state onto the video element.
  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      return
    }
    if (isPlaying) {
      void video.play().catch(() => {
        // Autoplay can be rejected before the user interacts; ignore — the
        // fallback timer still advances the slideshow.
      })
    } else {
      video.pause()
    }
  }, [isPlaying])

  return (
    <ScaledViewport className="bg-black">
      <div className="relative size-full">
        {meta?.type === 'video' && previewUrl ? (
          <video
            ref={videoRef}
            src={previewUrl}
            autoPlay
            muted
            playsInline
            onEnded={onAdvance}
            onError={onAdvance}
            className="absolute inset-0 size-full object-contain"
          />
        ) : previewUrl ? (
          <img src={previewUrl} alt="" className="absolute inset-0 size-full object-contain" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            {meta?.type === 'video' ? (
              <VideoIcon className="size-24 text-white/40" strokeWidth={1} />
            ) : (
              <ImageIcon className="size-24 text-white/40" strokeWidth={1} />
            )}
          </div>
        )}
      </div>
    </ScaledViewport>
  )
}

/** App slide: renders the live app bundle when resolvable, else a placeholder. */
function AppSlide({ meta }: { meta: AppMeta | null }) {
  if (!meta?.app) {
    return (
      <div className="flex size-full items-center justify-center bg-black">
        <AppWindowIcon className="size-24 text-white/40" strokeWidth={1} />
      </div>
    )
  }
  return <AppSlideInner instance={meta.instance} app={meta.app} />
}

/**
 * Split out so `useAppPreviewData` is only ever called with a defined app,
 * keeping the hook call unconditional within this component.
 */
function AppSlideInner({ instance, app }: { instance: AppInstance; app: CatalogApp }) {
  const { data, meta } = useAppPreviewData(app, instance.config, instance.id)
  return (
    <AppPreviewFrame slug={instance.appSlug} config={instance.config} data={data} meta={meta} />
  )
}

import { toYouTubeEmbedUrl } from '@edge/apps'

import type { AppInstanceConfig, EdgeApp } from '@/features/apps/types/app.types'

interface AppInstanceScreenProps {
  app: EdgeApp
  config: AppInstanceConfig
}

function readString(config: AppInstanceConfig, key: string): string {
  const value = config[key]
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * The content shown inside the live-preview TV screen. App-specific by slug —
 * the same logic the player will render later. For now only YouTube exists.
 */
export function AppInstanceScreen({ app, config }: AppInstanceScreenProps) {
  if (app.slug === 'youtube') {
    const embedUrl = toYouTubeEmbedUrl(readString(config, 'url'))
    if (!embedUrl) {
      return (
        <div className="@container flex size-full items-center justify-center bg-neutral-950 text-center">
          <p className="px-[8%] text-[3cqw] text-white/55">
            Empty
          </p>
        </div>
      )
    }
    return (
      <iframe
        src={embedUrl}
        title={app.name}
        className="size-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    )
  }

  // Generic fallback for apps without a dedicated preview yet.
  return (
    <div className="@container flex size-full items-center justify-center bg-neutral-900">
      <span className="text-[3cqw] font-medium text-white/70">{app.name}</span>
    </div>
  )
}

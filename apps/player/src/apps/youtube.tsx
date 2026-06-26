import { toYouTubeEmbedUrl } from '@edge/apps'
import type { AppRenderProps } from '@edge/apps-contract'

/**
 * First native app. Renders a muted, autoplaying, chromeless YouTube embed that
 * fills the surface. Reuses the shared URL parser so CMS preview and player
 * stay in lockstep.
 */
export function YouTubeApp({ config }: AppRenderProps) {
  const url = typeof config.url === 'string' ? config.url : ''
  const embed = toYouTubeEmbedUrl(url)

  if (!embed) {
    return <div class="player-app-error">Invalid YouTube URL</div>
  }

  return (
    <iframe
      class="player-media"
      title="YouTube"
      src={embed}
      allow="autoplay; encrypted-media; picture-in-picture"
      frameBorder={0}
      allowFullScreen
    />
  )
}

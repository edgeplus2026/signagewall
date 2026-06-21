/**
 * Shared YouTube URL helpers — used by the CMS preview now and by the player
 * render later, so the parsing logic lives in one place (the app's folder).
 */

/** Extract the video id from any common YouTube URL form, or null if invalid. */
export function parseYouTubeId(url: string): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url.trim())
    const host = parsed.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      return parsed.pathname.slice(1) || null
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname === '/watch') {
        return parsed.searchParams.get('v')
      }
      const match = /^\/(?:embed|shorts|v)\/([^/?]+)/.exec(parsed.pathname)
      if (match) return match[1] ?? null
    }
    return null
  } catch {
    return null
  }
}

/**
 * Build an autoplaying embed URL, or null if the input isn't a YouTube link.
 * Autoplay requires `mute=1` — browsers block unmuted autoplay; the player can
 * unmute on a kiosk later.
 */
export function toYouTubeEmbedUrl(url: string): string | null {
  const id = parseYouTubeId(url)
  if (!id) return null
  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    playsinline: '1',
    rel: '0',
    modestbranding: '1',
  })
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`
}

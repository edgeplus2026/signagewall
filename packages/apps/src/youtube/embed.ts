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
 *
 * Plays with sound (`mute=0`) — on a signage/kiosk player autoplay-with-sound is
 * allowed; a normal browser (e.g. the CMS preview) may keep it paused until a
 * gesture, which is expected. `controls=0` hides YouTube's control bar, and
 * `loop` (with `playlist=<id>`) keeps a single video looping so the
 * recommended-videos end screen never appears.
 */
export function toYouTubeEmbedUrl(url: string): string | null {
  const id = parseYouTubeId(url)
  if (!id) return null
  const params = new URLSearchParams({
    autoplay: '1',
    mute: '0',
    controls: '0',
    loop: '1',
    playlist: id,
    playsinline: '1',
    rel: '0',
    modestbranding: '1',
    iv_load_policy: '3',
    disablekb: '1',
  })
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`
}

/**
 * Shared Google Slides URL helper — used by the CMS preview and the player embed
 * bundle. Turns a published-to-web or shared presentation link into the
 * autoplaying `/embed` form.
 */

const HOST = 'docs.google.com'

/**
 * Build an autoplaying, looping Slides embed URL, or null if the input isn't a
 * Google Slides link. Handles both the "Publish to web" form
 * (`/presentation/d/e/<pubId>/pub`) and a shared-file link
 * (`/presentation/d/<fileId>/edit`), rewriting either to `.../embed`.
 *
 * `slideSeconds` becomes `delayms`; `loop` controls whether it restarts at the
 * end. `start=true` autostarts the slideshow.
 */
export function toGoogleSlidesEmbedUrl(
  url: string,
  options: { slideSeconds?: number; loop?: boolean } = {},
): string | null {
  try {
    const parsed = new URL(url.trim())
    if (parsed.hostname.replace(/^www\./, '') !== HOST) return null

    // `/presentation/d/<id>` or the published `/presentation/d/e/<id>`.
    const match = /^\/presentation\/d\/(e\/)?([^/]+)/.exec(parsed.pathname)
    if (!match) return null
    const idPath = match[1] ? `e/${match[2]}` : (match[2] as string)

    const ms =
      typeof options.slideSeconds === 'number' && options.slideSeconds > 0
        ? Math.round(options.slideSeconds * 1000)
        : 3000
    const params = new URLSearchParams({
      start: 'true',
      loop: options.loop === false ? 'false' : 'true',
      delayms: String(ms),
    })
    return `https://docs.google.com/presentation/d/${idPath}/embed?${params.toString()}`
  } catch {
    return null
  }
}

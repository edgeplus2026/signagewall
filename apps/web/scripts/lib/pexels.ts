// @ts-nocheck
/* Minimal Pexels client for the seed scripts.

   Reads PEXELS_API_KEY from the environment; apps/be already holds a working
   key, so the seed loads it from there rather than duplicating the secret.

   Photos are downloaded and re-uploaded into our own Media collection instead
   of hot-linked: Pexels CDN URLs are stable in practice but not contractual,
   and a marketing site should not have its article images depend on somebody
   else's uptime. */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const PEXELS_BASE = 'https://api.pexels.com/v1'

function readKey() {
  if (process.env.PEXELS_API_KEY) return process.env.PEXELS_API_KEY
  // Fall back to the backend's env file — same monorepo, same account.
  try {
    const env = readFileSync(join(process.cwd(), '../be/.env'), 'utf8')
    const line = env.split('\n').find((l) => l.startsWith('PEXELS_API_KEY='))
    if (line) return line.slice('PEXELS_API_KEY='.length).trim().replace(/^["']|["']$/g, '')
  } catch {
    // fall through to the explicit error below
  }
  throw new Error('PEXELS_API_KEY not set and apps/be/.env could not be read')
}

const API_KEY = readKey()

/**
 * First landscape result for `query`, skipping `skip` matches.
 *
 * `skip` exists so several images in one article don't come back identical
 * when their queries overlap — the seed passes a running offset.
 */
export async function findPhoto(query, { skip = 0, orientation = 'landscape' } = {}) {
  const url =
    `${PEXELS_BASE}/search?query=${encodeURIComponent(query)}` +
    `&per_page=${String(skip + 1)}&orientation=${orientation}`

  const res = await fetch(url, { headers: { Authorization: API_KEY } })
  if (!res.ok) throw new Error(`Pexels ${String(res.status)} for "${query}"`)

  const body = await res.json()
  const photo = body.photos?.[skip] ?? body.photos?.[0]
  if (!photo) return null

  return {
    id: photo.id,
    // large2x is ~1880px wide — enough for a full-bleed cover, small enough
    // that twenty of them don't bloat the repo's media store.
    url: photo.src.large2x,
    width: photo.width,
    height: photo.height,
    credit: photo.photographer,
    creditUrl: photo.photographer_url,
    sourceUrl: photo.url,
    /** Pexels' own description — a decent alt-text fallback. */
    description: photo.alt,
  }
}

export async function downloadPhoto(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`download failed: ${String(res.status)}`)
  return Buffer.from(await res.arrayBuffer())
}

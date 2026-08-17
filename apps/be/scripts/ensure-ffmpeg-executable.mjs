/**
 * Restores the execute bit on the bundled ffmpeg/ffprobe binaries after install.
 *
 * `@ffprobe-installer/<platform>` ships its binary inside the tarball and relies
 * on a `postinstall: chmod u+x ffprobe` to make it runnable. Under pnpm that is
 * not dependable: packages are hard-linked out of a content-addressable store, so
 * the mode a build script sets can be lost the next time the file is linked, and
 * a missing build approval skips the script entirely. Both were observed on this
 * repo — `ffmpeg` came out `0755` and `ffprobe` `0644` side by side.
 *
 * The consequence is silent and total. Every video upload throws EACCES deep
 * inside ffprobe, and the old pipeline caught that, logged one warning, and
 * stored the ORIGINAL file — so untranscoded 4K/HEVC clips went out to screens
 * while the CMS reported them ready. Owning the chmod here rather than trusting a
 * dependency's install script is the difference between a build-time guarantee
 * and a defect that only shows up on a customer's wall.
 *
 * Never fails the install: a missing optional binary is a degraded feature, and
 * the API's own boot check reports it far more usefully than a failed `pnpm
 * install` would.
 */
import { chmod } from 'node:fs/promises'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

/** Resolves a binary path without letting a missing package abort the script. */
function resolve(label, resolver) {
  try {
    const path = resolver()
    return typeof path === 'string' && path.length > 0 ? path : null
  } catch {
    console.warn(`[ffmpeg-perms] ${label} is not installed — skipping`)
    return null
  }
}

const binaries = [
  ['ffmpeg', () => require('ffmpeg-static')],
  ['ffprobe', () => require('@ffprobe-installer/ffprobe').path],
]

for (const [label, resolver] of binaries) {
  const path = resolve(label, resolver)
  if (!path) {
    continue
  }
  try {
    await chmod(path, 0o755)
  } catch (error) {
    console.warn(`[ffmpeg-perms] could not chmod ${label} at ${path}:`, error)
  }
}

#!/usr/bin/env node
/**
 * Assembles the Android update-channel manifest (`signagewall-player/android/latest.json`).
 * Mirrors build-latest-json.mjs's fail-closed ethos, but the Android trust anchor is
 * the APK signing certificate (PackageInstaller refuses a different cert) plus the
 * sha256 computed here — NOT minisign. Fails closed on any missing input.
 *
 * Usage:
 *   node build-android-latest-json.mjs \
 *     --version 0.2.0 --version-code 200 \
 *     --apk dist-android/signagewall-player-0.2.0.apk \
 *     --public-base https://releases.example.com --out dist-android/latest.json
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { basename } from 'node:path'

function arg(name) {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

const version = arg('version')
const versionCode = arg('version-code')
const apk = arg('apk')
const publicBase = arg('public-base')
const out = arg('out')

const missing = Object.entries({
  version,
  'version-code': versionCode,
  apk,
  'public-base': publicBase,
  out,
})
  .filter(([, v]) => !v)
  .map(([k]) => k)
if (missing.length) {
  console.error(`missing required arg(s): ${missing.map((m) => `--${m}`).join(', ')}`)
  process.exit(1)
}

const code = Number(versionCode)
if (!Number.isInteger(code) || code <= 0) {
  console.error(`--version-code must be a positive integer, got '${versionCode}'`)
  process.exit(1)
}

// Absolute, or the manifest ships a URL no device can resolve. A missing value is
// already caught above; this catches the half-right one — a bare hostname, or the
// bucket's internal endpoint — which reads fine to a human and is unusable to a
// player. The manifest is the fleet's only route to a new build, so a wrong URL
// here costs a visit to every screen rather than a re-publish.
if (!/^https:\/\/[^/]+/.test(publicBase)) {
  console.error(
    `--public-base must be an absolute https:// URL, got '${publicBase}'`,
  )
  process.exit(1)
}

const apkBytes = readFileSync(apk)
const sha256 = createHash('sha256').update(apkBytes).digest('hex')
const url = `${publicBase.replace(/\/$/, '')}/signagewall-player/android/${version}/${basename(apk)}`

const manifest = {
  versionName: version,
  versionCode: code,
  url,
  sha256,
  // The device refuses a download it cannot fit, and without this it has to guess.
  // A guess big enough to be safe for any APK is also big enough to refuse every
  // update on a nearly-full signage box — and the refusal used to count against the
  // version until it was abandoned. Publishing the real number removes the guess.
  size: apkBytes.length,
  pubDate: new Date().toISOString(),
}

writeFileSync(out, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Wrote ${out}:`, manifest)

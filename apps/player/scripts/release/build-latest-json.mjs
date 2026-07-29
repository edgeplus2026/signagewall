#!/usr/bin/env node
/**
 * Assembles the Tauri updater `latest.json` from the per-platform build
 * artifacts downloaded in CI. No dependencies — plain Node ESM.
 *
 * Layout it expects (from `actions/download-artifact` with `pattern: release-*`):
 *   <artifacts>/release-<platform-key>/<installer>
 *   <artifacts>/release-<platform-key>/<installer>.sig
 * where <platform-key> is a Tauri `OS-ARCH` key (windows-x86_64, darwin-aarch64,
 * darwin-x86_64, ...). The `.sig` CONTENT is inlined into `signature` (a path or
 * URL does not work), and each `url` points at the versioned R2 object.
 *
 * Fails CLOSED: `--require` lists the platform keys that must be present (the
 * fleet is Windows, so a manifest missing windows-x86_64 must never publish),
 * and each platform folder must hold exactly one installer + its signature. A
 * manifest 500 devices poll is not a place to guess.
 *
 * Usage:
 *   node build-latest-json.mjs --version 0.2.0 --artifacts dist-release \
 *     --public-base https://releases.example.com --out dist-release/latest.json
 *   [--require windows-x86_64,darwin-aarch64] [--notes "..."]
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** Tauri platform keys we know how to publish. */
const KNOWN_KEYS = new Set([
  'windows-x86_64',
  'darwin-aarch64',
  'darwin-x86_64',
  'linux-x86_64',
])

const ARTIFACT_PREFIX = 'release-'

/** Minimal `--flag value` parser (no deps). */
function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg.startsWith('--')) {
      out[arg.slice(2)] = argv[i + 1]
      i += 1
    }
  }
  return out
}

function fail(message) {
  console.error(`build-latest-json: ${message}`)
  process.exit(1)
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const version = args.version
  const artifactsDir = args.artifacts
  const publicBase = args['public-base']
  const out = args.out
  const notes = args.notes ?? `SignageWall Player ${version ?? ''}`.trim()
  const required = (args.require ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)

  if (!version) fail('missing --version')
  if (!artifactsDir) fail('missing --artifacts')
  if (!publicBase) fail('missing --public-base')
  if (!out) fail('missing --out')
  if (!existsSync(artifactsDir)) fail(`artifacts dir not found: ${artifactsDir}`)

  const base = publicBase.replace(/\/+$/, '')
  const platforms = {}

  for (const entry of readdirSync(artifactsDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith(ARTIFACT_PREFIX)) continue

    const key = entry.name.slice(ARTIFACT_PREFIX.length)
    if (!KNOWN_KEYS.has(key)) {
      console.warn(`skipping unknown platform dir: ${entry.name}`)
      continue
    }

    const dir = join(artifactsDir, entry.name)
    const files = readdirSync(dir)
    // Exactly one installer + its .sig. Anything else (a stray file, a renamed
    // artifact, a leaked .DS_Store) means the artifact wiring drifted, and
    // guessing would publish a manifest that points at the wrong bytes.
    const installers = files.filter((f) => !f.endsWith('.sig'))
    if (installers.length !== 1) {
      fail(
        `expected exactly 1 installer in ${dir}, found ${installers.length}: ${files.join(', ')}`,
      )
    }
    const installer = installers[0]

    const sigPath = join(dir, `${installer}.sig`)
    if (!existsSync(sigPath)) fail(`missing signature: ${sigPath}`)
    const signature = readFileSync(sigPath, 'utf8').trim()
    if (!signature) fail(`empty signature: ${sigPath}`)

    platforms[key] = {
      signature,
      url: `${base}/signagewall-player/${version}/${installer}`,
    }
    console.log(`+ ${key}: ${installer}`)
  }

  if (Object.keys(platforms).length === 0) {
    fail(`no platform artifacts found under ${artifactsDir}/${ARTIFACT_PREFIX}*`)
  }

  // Fail closed on a missing must-have platform: the fleet is Windows, so a
  // manifest without it would silently strand every device on the old version.
  const missing = required.filter((key) => !platforms[key])
  if (missing.length > 0) {
    fail(`required platform(s) missing from the manifest: ${missing.join(', ')}`)
  }

  const manifest = {
    version,
    notes,
    pub_date: new Date().toISOString(),
    platforms,
  }

  writeFileSync(out, `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`wrote ${out} (${Object.keys(platforms).length} platform(s))`)
}

main()

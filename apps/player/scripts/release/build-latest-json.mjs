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
 * Usage:
 *   node build-latest-json.mjs --version 0.2.0 --artifacts dist-release \
 *     --public-base https://releases.example.com --out dist-release/latest.json
 *   [--notes "..."]
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
  const notes = args.notes ?? `Edge Player ${version ?? ''}`.trim()

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
    const installer = files.find((f) => !f.endsWith('.sig'))
    if (!installer) fail(`no installer artifact in ${dir}`)

    const sigPath = join(dir, `${installer}.sig`)
    if (!existsSync(sigPath)) fail(`missing signature: ${sigPath}`)
    const signature = readFileSync(sigPath, 'utf8').trim()
    if (!signature) fail(`empty signature: ${sigPath}`)

    platforms[key] = {
      signature,
      url: `${base}/edge-player/${version}/${installer}`,
    }
    console.log(`+ ${key}: ${installer}`)
  }

  if (Object.keys(platforms).length === 0) {
    fail(`no platform artifacts found under ${artifactsDir}/${ARTIFACT_PREFIX}*`)
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

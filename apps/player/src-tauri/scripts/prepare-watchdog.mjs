// Builds the `signagewall-watchdog` sidecar and stages it where Tauri's `externalBin`
// expects it: binaries/signagewall-watchdog-<target-triple>[.exe].
//
// Run automatically by tauri's before{Dev,Build}Command (cwd = this src-tauri
// dir), so a plain `tauri dev` / `tauri build` "just works". Profile: debug for
// dev (shares the shell's already-built debug deps → fast), release for build
// (`--release`). Target: the host triple locally; in CI the per-leg triple via
// the WATCHDOG_TARGET env (so a macOS cross-build stages the right file).
//
// Bootstrap note: `externalBin` is a same-package sibling bin, and tauri-build's
// build script validates that the staged sidecar EXISTS for every cargo build of
// this package — including the very `cargo build --bin signagewall-watchdog` we use to
// produce it. So we drop an empty PLACEHOLDER at the staged path first (satisfies
// the existence check), build, then overwrite it with the real binary.
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Tauri runs before{Dev,Build}Command from the package dir (apps/player), not
// src-tauri, and CI may invoke us from elsewhere — so anchor to THIS file's dir
// and cd into src-tauri, making every path below (cargo, target/, binaries/) cwd
// independent.
process.chdir(join(dirname(fileURLToPath(import.meta.url)), '..'))

function hostTriple() {
  const out = execFileSync('rustc', ['-vV'], { encoding: 'utf8' })
  const m = out.match(/^host:\s*(.+)$/m)
  if (!m) throw new Error('prepare-watchdog: could not parse host triple from `rustc -vV`')
  return m[1].trim()
}

const explicit = (process.env.WATCHDOG_TARGET || '').trim()
const triple = explicit || hostTriple()
const release = process.argv.includes('--release') || explicit !== ''
const profile = release ? 'release' : 'debug'
const ext = triple.includes('windows') ? '.exe' : ''

mkdirSync('binaries', { recursive: true })
const dest = join('binaries', `signagewall-watchdog-${triple}${ext}`)
// Placeholder so tauri-build's externalBin existence check passes DURING the
// build below (chicken-and-egg: the bin lives in the package it's a sidecar of).
if (!existsSync(dest)) writeFileSync(dest, '')

const args = ['build', '--bin', 'signagewall-watchdog']
if (release) args.push('--release')
if (explicit) args.push('--target', triple)
console.log(`[prepare-watchdog] cargo ${args.join(' ')}`)
execFileSync('cargo', args, { stdio: 'inherit' })

const builtDir = explicit ? join('target', triple, profile) : join('target', profile)
copyFileSync(join(builtDir, `signagewall-watchdog${ext}`), dest)
console.log(`[prepare-watchdog] staged ${dest}`)

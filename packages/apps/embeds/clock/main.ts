import { pickColor } from '../_shared/color.js'
import { connectToHost } from '../_shared/host-bridge.js'
import type { ClockContext } from './context.js'

/*
 * THE ORDER OF THE NEXT THREE IMPORTS IS LOAD-BEARING. Do not let a tidy-up move
 * them. The bundler emits stylesheets in the order the modules are imported, and
 * the cascade breaks ties on source order — so the shared chrome has to be emitted
 * BEFORE the faces, or every rule in `style.css` silently outranks the
 * identically-specific rule a face wrote to override it.
 */
import '../_shared/base.css'
import './style.css'
import { DEFAULT_FACE, templateFor } from './templates/index.js'

/**
 * Clock runtime. Owns the host handshake, the colours, and the tick.
 *
 * The tick is the interesting part. A face is BUILT once (`render`) and PATCHED
 * every second (`paint`) — never rebuilt — because rebuilding the DOM once a second
 * would restart every animation on the screen sixty times a minute. See
 * `context.ts`; it is the reason this app's template interface has two methods
 * where the other apps' have one.
 */

const root = document.getElementById('app')

/** The whole of this app's state; the face is a pure function of it. */
let config: Record<string, unknown> = {}
/** The mounted face's root, i.e. what `paint` is handed. */
let face: HTMLElement | null = null
let timer: ReturnType<typeof setTimeout> | undefined

/** The theme presets the manifest's `theme` options mirror. */
const PRESETS: Record<string, { bg: string; text: string; accent: string }> = {
  light: { bg: '#FFFFFF', text: '#0F172A', accent: '#0EA5E9' },
  dark: { bg: '#000000', text: '#FFFFFF', accent: '#0EA5E9' },
  midnight: { bg: '#0B1220', text: '#E2E8F0', accent: '#F97316' },
}

/**
 * The instance's colours: the theme preset sets the base, and the three colour
 * fields override it when the operator has set them. Every one of them is run
 * through `pickColor`, which passes nothing but a validated hex — these values are
 * operator-authored and they are about to go straight into a `style` property.
 */
function resolveColors(): { bg: string; text: string; accent: string } {
  const preset =
    (typeof config.theme === 'string' ? PRESETS[config.theme] : undefined) ??
    PRESETS.dark ??
    { bg: '#000000', text: '#FFFFFF', accent: '#0EA5E9' }

  return {
    bg: pickColor(config.backgroundColor, preset.bg),
    text: pickColor(config.textColor, preset.text),
    accent: pickColor(config.accentColor, preset.accent),
  }
}

function buildContext(): ClockContext {
  return {
    now: new Date(),
    hour12: config.format === '12h',
    showSeconds: config.showSeconds === true,
    showDate: config.showDate !== false,
  }
}

/** A face name reaches a class name, so keep it to the shape of an identifier. */
function escapeAttr(value: string): string {
  return value.replace(/[^a-z0-9-]/gi, '')
}

/** Build the face. Only on a config change — never on a tick. */
function render(): void {
  if (!root) {
    return
  }

  const { bg, text, accent } = resolveColors()
  root.style.background = bg
  root.style.color = text
  // The faces reach the accent through the cascade, never through the context —
  // which is why all five of them recolour from one custom property.
  root.style.setProperty('--ck-accent', accent)

  const name = typeof config.face === 'string' ? config.face : DEFAULT_FACE
  const template = templateFor(name)
  const ctx = buildContext()

  root.innerHTML = `<div class="ck ck-face-${escapeAttr(name)}">${template.render(ctx)}</div>`
  face = root.firstElementChild as HTMLElement | null

  // Paint immediately, so the face is never on screen for up to a second showing
  // whatever placeholder its markup was built with.
  if (face) {
    template.paint(face, ctx)
  }
}

/** Move the clock. */
function paint(): void {
  if (!face) {
    return
  }
  const name = typeof config.face === 'string' ? config.face : DEFAULT_FACE
  templateFor(name).paint(face, buildContext())
}

/**
 * Tick on the second, and keep ticking on the second.
 *
 * NOT `setInterval(paint, 1000)`. That drifts — the browser fires it a few
 * milliseconds late, the lateness accumulates, and within an hour the clock is
 * updating at some arbitrary offset into the second. On a face showing seconds you
 * see it directly: the display changes visibly out of step with the second it is
 * naming, and every so often it skips one entirely.
 *
 * So each tick measures how far it is to the top of the NEXT second and sleeps
 * exactly that long. Drift can't accumulate, because every tick is scheduled from
 * the wall clock rather than from the previous tick. The 20ms cushion keeps a tick
 * that fires a hair early from landing back on the second it just painted.
 */
function scheduleTick(): void {
  if (timer !== undefined) {
    clearTimeout(timer)
  }
  const delay = 1000 - (Date.now() % 1000)
  timer = setTimeout(() => {
    paint()
    scheduleTick()
  }, delay + 20)
}

connectToHost((message) => {
  config = message.config
  render()
  scheduleTick()
})

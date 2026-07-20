import type { TickerPayload } from '../../src/ticker/payload.js'
import { pickColor } from '../_shared/color.js'
import { connectToHost } from '../_shared/host-bridge.js'
import { applyTextStyle } from '../_shared/text-style.js'

import '../_shared/base.css'
import './style.css'

const root = document.getElementById('app')

/** Scroll speed in pixels per second — kept constant regardless of text length. */
const SPEEDS: Record<string, number> = { slow: 55, normal: 110, fast: 210 }

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/**
 * Non-empty, trimmed messages from the CONFIG (fallback while no payload has
 * arrived, and for old static instances). New configs store an array of
 * `{message}` rows (the repeater field); older ones stored one message per
 * textarea line — both are accepted so a saved instance never breaks.
 */
function messagesOf(config: Record<string, unknown>): string[] {
  const value = config.messages
  if (Array.isArray(value)) {
    return value
      .map((row) => {
        const r = (row ?? {}) as Record<string, unknown>
        return typeof r.message === 'string' ? r.message.trim() : ''
      })
      .filter((message) => message.length > 0)
  }
  return (typeof value === 'string' ? value : '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

/**
 * One tiling unit of the message list: each message followed by a separator,
 * so repeated units flow into each other with the same gap between the last
 * message and the first of the next round.
 */
function buildUnit(messages: string[]): HTMLElement {
  const unit = document.createElement('div')
  unit.className = 'tk-copy'
  for (const message of messages) {
    const msg = document.createElement('span')
    msg.className = 'tk-msg'
    msg.textContent = message
    const sep = document.createElement('span')
    sep.className = 'tk-sep'
    sep.textContent = '•'
    unit.append(msg, sep)
  }
  return unit
}

function render(
  config: Record<string, unknown>,
  data: TickerPayload | null,
): void {
  if (!root) return

  // Typography onto the root so the band inherits it. Colours go on the BAND,
  // not the root: everything around the band stays transparent, so as a player
  // overlay only the band itself paints over the content.
  applyTextStyle(root, config)

  // Payload first (the connector resolves messages OR RSS headlines into it);
  // config rows only until the first payload lands, or for legacy instances.
  const fromPayload = Array.isArray(data?.messages)
    ? data.messages.filter(
        (m): m is string => typeof m === 'string' && m.trim().length > 0,
      )
    : []
  const messages = fromPayload.length > 0 ? fromPayload : messagesOf(config)

  // Legacy 'middle' (removed from the schema) degrades to bottom.
  const position = str(config.position) === 'top' ? 'top' : 'bottom'
  const direction = str(config.direction) === 'right' ? 'right' : 'left'

  const wrap = document.createElement('div')
  wrap.className = `tk tk-${position}${direction === 'right' ? ' tk-right' : ''}`

  const band = document.createElement('div')
  band.className = 'tk-band'
  band.style.background = pickColor(config.backgroundColor, '#000000')
  band.style.color = pickColor(config.textColor, '#FFFFFF')

  if (messages.length === 0) {
    const empty = document.createElement('div')
    empty.className = 'tk-empty'
    empty.textContent = 'Add a message'
    band.append(empty)
    wrap.append(band)
    root.replaceChildren(wrap)
    return
  }

  const viewport = document.createElement('div')
  viewport.className = 'tk-viewport'
  const track = document.createElement('div')
  track.className = 'tk-track'
  const unit = buildUnit(messages)
  track.append(unit)
  viewport.append(track)
  band.append(viewport)
  wrap.append(band)
  root.replaceChildren(wrap)

  // Two phases, both at the same constant pixels/second:
  //  1. ENTER (once): the track starts fully off the right edge, so the first
  //     thing on screen is the FIRST message walking in.
  //  2. LOOP (forever, seamless): the list repeats back-to-back with no blank
  //     band. A "segment" is the unit repeated enough times to span the
  //     viewport; the track holds two segments and shifts by exactly one, so
  //     the loop restart is invisible.
  // Measured after insertion (forces the layout we need); zero widths (an
  // off-screen/preload measure) fall back to sane durations.
  const viewportWidth = viewport.offsetWidth
  const unitWidth = unit.offsetWidth
  let segmentWidth = unitWidth
  if (viewportWidth > 0 && unitWidth > 0) {
    const repeats = Math.max(1, Math.ceil(viewportWidth / unitWidth))
    segmentWidth = unitWidth * repeats
    for (let i = 1; i < repeats * 2; i++) {
      track.append(unit.cloneNode(true))
    }
  } else {
    track.append(unit.cloneNode(true))
  }
  const pxPerSec = SPEEDS[str(config.speed)] ?? SPEEDS.normal!
  const enterDuration = viewportWidth > 0 ? viewportWidth / pxPerSec : 8
  const loopDuration = segmentWidth > 0 ? segmentWidth / pxPerSec : 30
  track.style.setProperty('--tk-enter-dur', `${enterDuration}s`)
  track.style.setProperty('--tk-loop-dur', `${loopDuration}s`)
  track.style.setProperty('--tk-shift', `${segmentWidth}px`)
}

connectToHost<Record<string, unknown>, TickerPayload>(({ config, data }) =>
  render(config ?? {}, data),
)

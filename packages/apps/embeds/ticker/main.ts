import { DEFAULT_ACCENT } from '../../src/_shared/theme.js'
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
 * Non-empty, trimmed messages. New configs store an array of `{message}` rows
 * (the repeater field); older ones stored one message per textarea line — both
 * are accepted so a saved instance never breaks.
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
 * One copy of the message list: each message followed by a separator, so a
 * trailing gap sits between the last message and the first of the next copy.
 */
function buildCopy(messages: string[]): HTMLElement {
  const copy = document.createElement('div')
  copy.className = 'tk-copy'
  for (const message of messages) {
    const msg = document.createElement('span')
    msg.className = 'tk-msg'
    msg.textContent = message
    const sep = document.createElement('span')
    sep.className = 'tk-sep'
    sep.textContent = '•'
    copy.append(msg, sep)
  }
  return copy
}

function render(config: Record<string, unknown>): void {
  if (!root) return

  // Chrome first: colours + typography onto the root so the band inherits them.
  root.style.background = pickColor(config.backgroundColor, '#000000')
  root.style.color = pickColor(config.textColor, '#FFFFFF')
  root.style.setProperty(
    '--tk-accent',
    pickColor(config.accentColor, DEFAULT_ACCENT),
  )
  applyTextStyle(root, config)

  const messages = messagesOf(config)
  const position = str(config.position) || 'middle'
  const direction = str(config.direction) === 'right' ? 'right' : 'left'

  const wrap = document.createElement('div')
  wrap.className = `tk tk-${position}${direction === 'right' ? ' tk-right' : ''}`

  if (messages.length === 0) {
    const empty = document.createElement('div')
    empty.className = 'tk-empty'
    empty.textContent = 'Add a message'
    wrap.append(empty)
    root.replaceChildren(wrap)
    return
  }

  const viewport = document.createElement('div')
  viewport.className = 'tk-viewport'
  const track = document.createElement('div')
  track.className = 'tk-track'
  // Two identical copies: the -50% translate moves exactly one copy-width, so the
  // second copy lands where the first began — a seamless loop.
  const first = buildCopy(messages)
  track.append(first, buildCopy(messages))
  viewport.append(track)
  wrap.append(viewport)
  root.replaceChildren(wrap)

  // Duration from the measured copy width, so pixels/second stays constant. Read
  // after it's in the DOM (forces the layout we need). Guard a zero width (an
  // off-screen/preload measure) with a sane fallback.
  const pxPerSec = SPEEDS[str(config.speed)] ?? SPEEDS.normal!
  const width = first.offsetWidth
  const duration = width > 0 ? width / pxPerSec : 30
  track.style.setProperty('--tk-dur', `${duration}s`)
}

connectToHost(({ config }) => render(config))

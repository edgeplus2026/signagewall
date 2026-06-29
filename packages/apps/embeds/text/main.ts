import { connectToHost } from '../_shared/host-bridge.js'
import '../_shared/base.css'
import './style.css'

const root = document.getElementById('app')

const SIZES = {
  small: '5vw',
  medium: '8vw',
  large: '12vw',
} as const
type SizeKey = keyof typeof SIZES
const ALIGNS = new Set(['left', 'center', 'right'])
/** Accept only a hex color, so the value can't smuggle extra CSS declarations. */
const HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/

function isSizeKey(value: unknown): value is SizeKey {
  return typeof value === 'string' && value in SIZES
}

function render(config: Record<string, unknown>): void {
  if (!root) return
  const body = typeof config.body === 'string' ? config.body : ''
  const align =
    typeof config.align === 'string' && ALIGNS.has(config.align)
      ? config.align
      : 'center'
  const size: SizeKey = isSizeKey(config.size) ? config.size : 'medium'
  const color =
    typeof config.color === 'string' && HEX_COLOR.test(config.color)
      ? config.color
      : ''
  const bold = config.bold === true

  const p = document.createElement('p')
  p.className = 'text-body'
  // textContent escapes the operator-authored body; whitespace/newlines are
  // preserved via CSS `white-space: pre-wrap`.
  p.textContent = body
  p.style.fontSize = SIZES[size]
  p.style.textAlign = align
  if (color) {
    p.style.color = color
  }
  p.style.fontWeight = bold ? '700' : '400'

  const wrap = document.createElement('div')
  wrap.className = 'center text-wrap'
  wrap.style.justifyContent =
    align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center'
  wrap.appendChild(p)
  root.replaceChildren(wrap)
}

connectToHost(({ config }) => render(config))

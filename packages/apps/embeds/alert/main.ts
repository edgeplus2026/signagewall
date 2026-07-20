import { connectToHost } from '../_shared/host-bridge.js'
import { applyTextStyle } from '../_shared/text-style.js'
import '../_shared/base.css'
import './style.css'

const root = document.getElementById('app')

const TRIANGLE =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>'
const INFO =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/></svg>'

/** Each severity is a whole look: a saturated background + white text + a glyph. */
const SEVERITY: Record<string, { bg: string; icon: string }> = {
  critical: { bg: '#B91C1C', icon: TRIANGLE },
  warning: { bg: '#B45309', icon: TRIANGLE },
  info: { bg: '#1D4ED8', icon: INFO },
}

interface AlertConfig {
  headline?: string
  message?: string
  severity?: string
  showIcon?: boolean
  pulse?: boolean
}

/**
 * Shrink the type until the whole alert fits the screen: a long message must
 * never be cut off — an alert you can't read to the end is a failed alert.
 * The multiplier feeds `--al-fit` (font sizes + icon scale in the stylesheet).
 */
function fitToViewport(wrap: HTMLElement): void {
  wrap.style.setProperty('--al-fit', '1')
  let scale = 1
  while (wrap.scrollHeight > wrap.clientHeight + 1 && scale > 0.35) {
    scale = Math.round((scale - 0.05) * 100) / 100
    wrap.style.setProperty('--al-fit', String(scale))
  }
}

function render(config: AlertConfig): void {
  if (!root) return
  const severity = SEVERITY[String(config.severity)] ?? SEVERITY.critical!
  root.style.background = severity.bg
  root.style.color = '#fff'
  // Shared Style Settings (font, weight, size %, line height, spacing) → CSS
  // custom properties the stylesheet consumes.
  applyTextStyle(root, config as Record<string, unknown>)

  const wrap = document.createElement('div')
  wrap.className = 'al'

  if (config.showIcon !== false) {
    const icon = document.createElement('div')
    icon.className = 'al-icon'
    // Controlled SVG constant — safe as innerHTML.
    icon.innerHTML = severity.icon
    wrap.append(icon)
  }

  const headline = document.createElement('h1')
  headline.className = 'al-headline'
  // Operator text → textContent, never innerHTML.
  headline.textContent =
    typeof config.headline === 'string' ? config.headline : ''
  wrap.append(headline)

  const message =
    typeof config.message === 'string' ? config.message.trim() : ''
  if (message) {
    const detail = document.createElement('p')
    detail.className = 'al-msg'
    detail.textContent = message
    wrap.append(detail)
  }

  if (config.pulse !== false) {
    const ring = document.createElement('div')
    ring.className = 'al-ring'
    wrap.append(ring)
  }

  root.replaceChildren(wrap)
  // Measure AFTER insertion (forces the layout the fit loop reads).
  fitToViewport(wrap)
}

connectToHost<AlertConfig>(({ config }) => {
  render(config)
})

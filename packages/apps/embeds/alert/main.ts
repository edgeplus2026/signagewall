import { connectToHost } from '../_shared/host-bridge.js'
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

function render(config: AlertConfig): void {
  if (!root) return
  const severity = SEVERITY[String(config.severity)] ?? SEVERITY.critical!
  root.style.background = severity.bg
  root.style.color = '#fff'

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
}

connectToHost<AlertConfig>(({ config }) => {
  render(config)
})

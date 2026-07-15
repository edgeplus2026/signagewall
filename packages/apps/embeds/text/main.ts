import { connectToHost } from '../_shared/host-bridge.js'
import '../_shared/base.css'
import './style.css'

const root = document.getElementById('app')

/** A hex color; anything else falls back to the default. */
const HEX = /^#[0-9a-fA-F]{3,8}$/
/**
 * Formatting tags the rich-text field can produce. Everything else is unwrapped
 * to text and ALL attributes are stripped — so no `style`/`on*`/`href`/`src`
 * survives and the operator-authored HTML can't carry script/XSS.
 */
const ALLOWED_TAGS = new Set([
  'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'BR', 'P', 'DIV', 'SPAN',
  'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'BLOCKQUOTE',
])
/** The style declarations we keep (rich-text size / alignment / family / spacing). */
const FONT_SIZE_RE = /^\d+(\.\d+)?(px|rem|em|%|vw|vh)$/
const TEXT_ALIGN = new Set(['left', 'center', 'right', 'justify'])
// font-family can't execute JS; we still bound it to plain font-token chars.
const FONT_FAMILY_RE = /^[\w\s,'"-]{1,120}$/
const LINE_HEIGHT_RE = /^\d+(\.\d+)?(px|rem|em|%)?$/
const LETTER_SPACING_RE = /^(normal|-?\d+(\.\d+)?(px|rem|em))$/

/**
 * Sanitize operator HTML to a safe formatting subset before rendering: keep only
 * allowed tags, and on them keep ONLY a validated `font-size` / `text-align`
 * inline style (the editor's two style-based features). Everything else —
 * `on*`, `href`, `src`, scripts, other CSS — is dropped, so the HTML can't carry
 * script/XSS.
 */
function sanitize(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const clean = (node: Element): void => {
    for (const child of Array.from(node.children)) {
      if (!ALLOWED_TAGS.has(child.tagName)) {
        // Unwrap to text (a <script>/<img onerror> becomes harmless text/nothing).
        child.replaceWith(document.createTextNode(child.textContent ?? ''))
        continue
      }
      const el = child as HTMLElement
      // Capture the style props we keep (the browser already parsed them).
      const fontSize = el.style.fontSize
      const textAlign = el.style.textAlign
      const fontFamily = el.style.fontFamily
      const lineHeight = el.style.lineHeight
      const letterSpacing = el.style.letterSpacing
      for (const attr of Array.from(el.attributes)) {
        el.removeAttribute(attr.name)
      }
      if (fontSize && FONT_SIZE_RE.test(fontSize)) {
        el.style.fontSize = fontSize
      }
      if (textAlign && TEXT_ALIGN.has(textAlign)) {
        el.style.textAlign = textAlign
      }
      if (fontFamily && FONT_FAMILY_RE.test(fontFamily)) {
        el.style.fontFamily = fontFamily
      }
      if (lineHeight && LINE_HEIGHT_RE.test(lineHeight)) {
        el.style.lineHeight = lineHeight
      }
      if (letterSpacing && LETTER_SPACING_RE.test(letterSpacing)) {
        el.style.letterSpacing = letterSpacing
      }
      clean(el)
    }
  }
  clean(doc.body)
  return doc.body.innerHTML
}

function pickColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && HEX.test(value) ? value : fallback
}

/**
 * A safe http(s) image URL for use in `background-image: url("…")`. Rejects any
 * value that could break out of the CSS url() (quotes, parens, whitespace,
 * backslash) so an operator- or AI-supplied URL can't inject CSS.
 */
const SAFE_URL = /^https?:\/\/[^\s"'()\\]+$/i
function pickUrl(value: unknown): string | null {
  return typeof value === 'string' && SAFE_URL.test(value) ? value : null
}

const OVERLAYS = new Set(['none', 'light', 'dark'])
function pickOverlay(value: unknown): string {
  return typeof value === 'string' && OVERLAYS.has(value) ? value : 'dark'
}

function render(config: Record<string, unknown>): void {
  if (!root) return

  const bgImage = pickUrl(config.backgroundImage)

  // Reset the layered styles each render (config can update in place).
  root.style.backgroundImage = ''
  root.style.backgroundSize = ''
  root.style.backgroundPosition = ''
  if (bgImage) {
    root.style.backgroundColor = '#000000'
    root.style.backgroundImage = `url("${bgImage}")`
    root.style.backgroundSize = 'cover'
    root.style.backgroundPosition = 'center'
  } else {
    root.style.background = pickColor(config.backgroundColor, '#000000')
  }

  const children: HTMLElement[] = []

  // Scrim over the photo so overlaid text stays legible.
  if (bgImage) {
    const overlay = pickOverlay(config.overlay)
    if (overlay !== 'none') {
      const scrim = document.createElement('div')
      scrim.className = `text-scrim text-scrim-${overlay}`
      children.push(scrim)
    }
  }

  const bodyHtml = sanitize(typeof config.body === 'string' ? config.body : '')
  if (bodyHtml.trim()) {
    const block = document.createElement('div')
    block.className = 'text-rich'
    block.style.color = pickColor(config.color, '#FFFFFF')
    block.innerHTML = bodyHtml

    const wrap = document.createElement('div')
    wrap.className = 'center'
    wrap.appendChild(block)
    children.push(wrap)
  }

  root.replaceChildren(...children)
}

connectToHost(({ config }) => render(config))

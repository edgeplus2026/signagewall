import { CURRENCY_OPTIONS } from '../../src/currency/currencies.js'
import type { FxPayload } from '../../src/currency/payload.js'
import { DEFAULT_ACCENT } from '../../src/_shared/theme.js'
import { freshnessFooterHtml } from '../_shared/freshness.js'
import { type AppDataMeta, connectToHost } from '../_shared/host-bridge.js'
import { applyTextStyle } from '../_shared/text-style.js'

import '../_shared/base.css'
import './style.css'

const root = document.getElementById('app')

/** Code → human name, derived once from the shared currency list ("USD — US dollar"). */
const NAMES = new Map<string, string>(
  CURRENCY_OPTIONS.map((option) => {
    const name = option.label.split('—')[1]?.trim() ?? option.value
    return [option.value, name]
  }),
)

/** Theme presets mirrored from the manifest's `theme` options. */
const THEMES: Record<string, { bg: string; text: string }> = {
  light: { bg: '#FFFFFF', text: '#0F172A' },
  dark: { bg: '#0B1220', text: '#E2E8F0' },
}

/** Format a rate with a sensible number of decimals for its magnitude. */
const rateFormat = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
})

function applyChrome(config: Record<string, unknown>): void {
  if (!root) return
  const theme = THEMES[String(config.theme)] ?? THEMES.dark!
  root.style.background = theme.bg
  root.style.color = theme.text
  root.style.setProperty('--fx-accent', DEFAULT_ACCENT)
  applyTextStyle(root, config)
}

function render(
  config: Record<string, unknown>,
  data: FxPayload | null,
  meta: AppDataMeta | null,
): void {
  if (!root) return
  applyChrome(config)

  if (!data || data.rates.length === 0) {
    root.innerHTML = '<div class="fx"><p class="fx-empty">Loading rates…</p></div>'
    return
  }

  const wrap = document.createElement('div')
  wrap.className = 'fx'

  const head = document.createElement('div')
  head.className = 'fx-head'
  head.textContent = `1 ${data.base} =`
  wrap.append(head)

  const list = document.createElement('div')
  list.className = 'fx-list'
  for (const { code, rate } of data.rates) {
    const row = document.createElement('div')
    row.className = 'fx-row'

    const left = document.createElement('div')
    left.className = 'fx-code'
    const codeEl = document.createElement('b')
    codeEl.textContent = code
    left.append(codeEl)
    const name = NAMES.get(code)
    if (name) {
      const nameEl = document.createElement('span')
      nameEl.className = 'fx-name'
      nameEl.textContent = name
      left.append(nameEl)
    }

    const rateEl = document.createElement('div')
    rateEl.className = 'fx-rate'
    rateEl.textContent = rateFormat.format(rate)

    row.append(left, rateEl)
    list.append(row)
  }
  wrap.append(list)
  root.replaceChildren(wrap)
  // Controlled markup (an ISO time + literals) — see freshnessFooterHtml.
  root.insertAdjacentHTML('beforeend', freshnessFooterHtml(meta))
}

connectToHost<Record<string, unknown>, FxPayload>(({ config, data, meta }) => {
  render(config, data, meta)
})

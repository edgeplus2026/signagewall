import { CURRENCY_OPTIONS } from '../../src/currency/currencies.js'
import type { FxPayload } from '../../src/currency/payload.js'
import { DEFAULT_ACCENT } from '../../src/_shared/theme.js'
import { freshnessFooterHtml } from '../_shared/freshness.js'
import { type AppDataMeta, connectToHost } from '../_shared/host-bridge.js'

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

/**
 * Currency symbol for the row badge ("€", "$", "kr"). Falls back to the ISO
 * code itself when the locale has no shorter symbol (e.g. RSD) — the CSS then
 * shrinks the badge type so three letters still fit.
 */
const symbolCache = new Map<string, string>()
function symbolOf(code: string): string {
  const cached = symbolCache.get(code)
  if (cached !== undefined) return cached
  let symbol = code
  try {
    symbol =
      new Intl.NumberFormat('en', {
        style: 'currency',
        currency: code,
        currencyDisplay: 'narrowSymbol',
      })
        .formatToParts(1)
        .find((part) => part.type === 'currency')?.value ?? code
  } catch {
    // Unknown code for this runtime — the code itself is a fine badge.
  }
  symbolCache.set(code, symbol)
  return symbol
}

/**
 * Rates read best at a precision matched to their magnitude: "117.20", not
 * "117.1992"; "1.0842", not "1.08". Tiny rates (an expensive base) keep three
 * significant digits so they never collapse to "0.0000".
 */
function formatRate(rate: number): string {
  if (rate < 0.1) {
    return new Intl.NumberFormat(undefined, {
      maximumSignificantDigits: 3,
    }).format(rate)
  }
  const digits = rate >= 50 ? 2 : 4
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(rate)
}

/** The upstream reference date ("2026-07-20") as a short local date. */
function formatDate(iso: string): string {
  if (!iso) return ''
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function applyChrome(config: Record<string, unknown>): void {
  if (!root) return
  root.className = config.theme === 'light' ? 'fx-theme-light' : 'fx-theme-dark'
  root.style.setProperty('--fx-accent', DEFAULT_ACCENT)
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

  const head = document.createElement('header')
  head.className = 'fx-head'

  const headLeft = document.createElement('div')
  const eyebrow = document.createElement('div')
  eyebrow.className = 'fx-eyebrow'
  eyebrow.textContent = 'Exchange rates'
  const title = document.createElement('div')
  title.className = 'fx-title'
  const unit = document.createElement('b')
  unit.textContent = `1 ${data.base}`
  title.append(unit)
  const baseName = NAMES.get(data.base)
  if (baseName) {
    const nameEl = document.createElement('span')
    nameEl.className = 'fx-title-name'
    nameEl.textContent = baseName
    title.append(nameEl)
  }
  headLeft.append(eyebrow, title)
  head.append(headLeft)

  const dateLabel = formatDate(data.date)
  if (dateLabel) {
    const dateEl = document.createElement('div')
    dateEl.className = 'fx-date'
    dateEl.textContent = dateLabel
    head.append(dateEl)
  }
  wrap.append(head)

  // One column reads best up to six rows; beyond that, split into two so every
  // row keeps its size instead of shrinking into an unreadable strip.
  const count = data.rates.length
  const columns = count > 6 ? 2 : 1
  const rowsPerColumn = Math.ceil(count / columns)

  const list = document.createElement('div')
  list.className = 'fx-list'
  list.style.setProperty('--fx-cols', String(columns))
  list.style.setProperty('--fx-rows', String(rowsPerColumn))

  data.rates.forEach(({ code, rate }, index) => {
    const row = document.createElement('div')
    row.className = 'fx-row'
    // Hide the divider under the bottom row of each column.
    if ((index + 1) % rowsPerColumn === 0 || index === count - 1) {
      row.classList.add('fx-row-last')
    }

    const badge = document.createElement('div')
    badge.className = 'fx-badge'
    const symbol = symbolOf(code)
    if (symbol.length > 2) badge.classList.add('fx-badge-long')
    badge.textContent = symbol

    const id = document.createElement('div')
    id.className = 'fx-id'
    const codeEl = document.createElement('b')
    codeEl.textContent = code
    id.append(codeEl)
    const name = NAMES.get(code)
    if (name) {
      const nameEl = document.createElement('span')
      nameEl.className = 'fx-name'
      nameEl.textContent = name
      id.append(nameEl)
    }

    const rateEl = document.createElement('div')
    rateEl.className = 'fx-rate'
    rateEl.textContent = formatRate(rate)

    row.append(badge, id, rateEl)
    list.append(row)
  })
  wrap.append(list)
  root.replaceChildren(wrap)
  // Controlled markup (an ISO time + literals) — see freshnessFooterHtml.
  root.insertAdjacentHTML('beforeend', freshnessFooterHtml(meta))
}

connectToHost<Record<string, unknown>, FxPayload>(({ config, data, meta }) => {
  render(config, data, meta)
})

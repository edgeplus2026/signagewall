import type { StocksPayload } from '../../src/stocks/payload.js'
import { freshnessFooterHtml } from '../_shared/freshness.js'
import { type AppDataMeta, connectToHost } from '../_shared/host-bridge.js'
import { applyTextStyle } from '../_shared/text-style.js'

import '../_shared/base.css'
import './style.css'

const root = document.getElementById('app')

const THEMES: Record<string, { bg: string; text: string }> = {
  light: { bg: '#FFFFFF', text: '#0F172A' },
  dark: { bg: '#0B1220', text: '#E2E8F0' },
}

const priceFormat = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function formatChange(change: number, percent: number): string {
  const arrow = percent >= 0 ? '▲' : '▼'
  const sign = change >= 0 ? '+' : '−'
  return `${arrow} ${sign}${Math.abs(change).toFixed(2)} (${Math.abs(percent).toFixed(2)}%)`
}

function applyChrome(config: Record<string, unknown>): void {
  if (!root) return
  const theme = THEMES[String(config.theme)] ?? THEMES.dark!
  root.style.background = theme.bg
  root.style.color = theme.text
  applyTextStyle(root, config)
}

function render(
  config: Record<string, unknown>,
  data: StocksPayload | null,
  meta: AppDataMeta | null,
): void {
  if (!root) return
  applyChrome(config)

  if (!data || data.quotes.length === 0) {
    root.innerHTML = '<div class="stk"><p class="stk-empty">Loading prices…</p></div>'
    return
  }

  const showChange = config.showChange !== false

  const wrap = document.createElement('div')
  wrap.className = 'stk'

  for (const quote of data.quotes) {
    const row = document.createElement('div')
    row.className = 'stk-row'

    const sym = document.createElement('div')
    sym.className = 'stk-sym'
    sym.textContent = quote.symbol

    const right = document.createElement('div')
    right.className = 'stk-right'
    const price = document.createElement('div')
    price.className = 'stk-price'
    price.textContent = priceFormat.format(quote.price)
    right.append(price)

    if (showChange) {
      const change = document.createElement('div')
      change.className = `stk-change ${quote.changePercent >= 0 ? 'stk-up' : 'stk-down'}`
      change.textContent = formatChange(quote.change, quote.changePercent)
      right.append(change)
    }

    row.append(sym, right)
    wrap.append(row)
  }

  root.replaceChildren(wrap)
  root.insertAdjacentHTML('beforeend', freshnessFooterHtml(meta))
}

connectToHost<Record<string, unknown>, StocksPayload>(({ config, data, meta }) => {
  render(config, data, meta)
})

import type { CryptoPayload } from '../../src/crypto/payload.js'
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

/** Currency price with more decimals for sub-1 prices (e.g. DOGE), fewer above. */
function formatPrice(price: number, currency: string): string {
  const maximumFractionDigits = price !== 0 && Math.abs(price) < 1 ? 6 : 2
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits,
    }).format(price)
  } catch {
    // An unexpected currency code — fall back to a plain number rather than throw.
    return price.toFixed(2)
  }
}

function formatChange(pct: number): string {
  return `${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(2)}%`
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
  data: CryptoPayload | null,
  meta: AppDataMeta | null,
): void {
  if (!root) return
  applyChrome(config)

  if (!data || data.coins.length === 0) {
    root.innerHTML =
      '<div class="cx"><p class="cx-empty">Loading prices…</p></div>'
    return
  }

  const currency = data.vs.toUpperCase()
  const showChange = config.showChange !== false

  const wrap = document.createElement('div')
  wrap.className = 'cx'

  for (const coin of data.coins) {
    const row = document.createElement('div')
    row.className = 'cx-row'

    const id = document.createElement('div')
    id.className = 'cx-id'
    const sym = document.createElement('div')
    sym.className = 'cx-sym'
    sym.textContent = coin.symbol
    const name = document.createElement('div')
    name.className = 'cx-name'
    name.textContent = coin.name
    id.append(sym, name)

    const right = document.createElement('div')
    right.className = 'cx-right'
    const price = document.createElement('div')
    price.className = 'cx-price'
    price.textContent = formatPrice(coin.price, currency)
    right.append(price)

    if (showChange && typeof coin.change24h === 'number') {
      const change = document.createElement('div')
      change.className = `cx-change ${coin.change24h >= 0 ? 'cx-up' : 'cx-down'}`
      change.textContent = formatChange(coin.change24h)
      right.append(change)
    }

    row.append(id, right)
    wrap.append(row)
  }

  root.replaceChildren(wrap)
  root.insertAdjacentHTML('beforeend', freshnessFooterHtml(meta))
}

connectToHost<Record<string, unknown>, CryptoPayload>(
  ({ config, data, meta }) => {
    render(config, data, meta)
  },
)

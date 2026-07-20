import type { CryptoPayload } from '../../src/crypto/payload.js'
import { freshnessFooterHtml } from '../_shared/freshness.js'
import { type AppDataMeta, connectToHost } from '../_shared/host-bridge.js'

import '../_shared/base.css'
import './style.css'

const root = document.getElementById('app')

/**
 * Per-coin accent colours — brand-inspired but tuned to stay readable on the
 * dark terminal background (the light theme darkens them via color-mix).
 */
const COIN_COLORS: Record<string, string> = {
  bitcoin: '#F7931A',
  ethereum: '#8CA5FF',
  tether: '#2ED8A7',
  binancecoin: '#F3BA2F',
  solana: '#14F195',
  ripple: '#38BDF8',
  cardano: '#4C82FB',
  dogecoin: '#E3C55C',
  polkadot: '#FF3B9A',
  litecoin: '#A7B7CE',
  chainlink: '#5C87FF',
  tron: '#FF4D5E',
}

const FALLBACK_COIN_COLOR = '#00FF9C'

/**
 * Last rendered price per coin id, so a refresh can flash the row that moved
 * (up/down). Survives across renders; reset is harmless (no flash).
 */
const lastPrices = new Map<string, number>()

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

function render(
  config: Record<string, unknown>,
  data: CryptoPayload | null,
  meta: AppDataMeta | null,
): void {
  if (!root) return
  const light = String(config.theme) === 'light'
  root.className = light ? 'cx-light' : 'cx-dark'

  if (!data || data.coins.length === 0) {
    root.innerHTML =
      '<div class="cx"><div class="cx-scan"></div>' +
      '<p class="cx-empty">▮ CONNECTING TO FEED<span class="cx-cursor">_</span></p></div>'
    return
  }

  const currency = data.vs.toUpperCase()
  const showChange = config.showChange !== false

  const wrap = document.createElement('div')
  wrap.className = 'cx'

  // Decorative overlays: background grid + CRT scanlines (dark theme only).
  const scan = document.createElement('div')
  scan.className = 'cx-scan'
  wrap.append(scan)

  const header = document.createElement('header')
  header.className = 'cx-head'
  const title = document.createElement('div')
  title.className = 'cx-title'
  title.innerHTML =
    '<span class="cx-title-dim">CRYPTO://</span>MARKET<span class="cx-cursor">_</span>'
  const status = document.createElement('div')
  status.className = 'cx-status'
  status.innerHTML =
    `<span class="cx-live"><span class="cx-live-dot"></span>LIVE</span>` +
    `<span class="cx-vs">${currency}</span>`
  header.append(title, status)
  wrap.append(header)

  const list = document.createElement('div')
  list.className = 'cx-list'

  data.coins.forEach((coin, index) => {
    const row = document.createElement('div')
    row.className = 'cx-row'
    row.style.setProperty('--coin', COIN_COLORS[coin.id] ?? FALLBACK_COIN_COLOR)

    const prev = lastPrices.get(coin.id)
    if (prev !== undefined && coin.price !== prev) {
      row.classList.add(coin.price > prev ? 'cx-tick-up' : 'cx-tick-down')
    }
    lastPrices.set(coin.id, coin.price)

    const rank = document.createElement('div')
    rank.className = 'cx-rank'
    rank.textContent = String(index + 1).padStart(2, '0')

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

    row.append(rank, id, right)
    list.append(row)
  })

  wrap.append(list)

  const foot = document.createElement('footer')
  foot.className = 'cx-foot'
  foot.textContent = '// COINGECKO FEED'
  wrap.append(foot)

  root.replaceChildren(wrap)
  root.insertAdjacentHTML('beforeend', freshnessFooterHtml(meta))
}

connectToHost<Record<string, unknown>, CryptoPayload>(
  ({ config, data, meta }) => {
    render(config, data, meta)
  },
)

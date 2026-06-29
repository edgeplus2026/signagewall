import type { FxPayload } from '../../src/fx/payload.js'
import { freshnessFooterHtml } from '../_shared/freshness.js'
import { type AppDataMeta, connectToHost } from '../_shared/host-bridge.js'
import '../_shared/base.css'
import './style.css'

const root = document.getElementById('app')

function escapeHtml(value: string): string {
  const div = document.createElement('div')
  div.textContent = value
  return div.innerHTML
}

/** Parse the comma-separated quote list from config into upper-case ISO codes. */
function parseQuotes(config: Record<string, unknown>): string[] {
  const raw = typeof config.quotes === 'string' ? config.quotes : ''
  return raw
    .split(',')
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean)
}

function render(
  config: Record<string, unknown>,
  data: FxPayload | null,
  meta: AppDataMeta | null,
): void {
  if (!root) return
  if (!data) {
    root.innerHTML = '<div class="center"><p>Loading rates…</p></div>'
    return
  }
  const quotes = parseQuotes(config)
  const rows = quotes
    .map((code) => {
      const rate = data.rates[code]
      const value =
        typeof rate === 'number'
          ? rate.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 4,
            })
          : '—'
      return `<div class="fx-row"><span class="fx-pair">${escapeHtml(data.base)}/${escapeHtml(code)}</span><span class="fx-rate">${value}</span></div>`
    })
    .join('')

  root.innerHTML = `
    <div class="center fx">
      <div class="fx-base">1 ${escapeHtml(data.base)} =</div>
      <div class="fx-rows">${rows}</div>
    </div>
    ${freshnessFooterHtml(meta)}`
}

connectToHost<Record<string, unknown>, FxPayload>(({ config, data, meta }) => {
  render(config, data, meta)
})

import type { RssPayload } from '../../src/rss/payload.js'
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

function clampItems(
  config: Record<string, unknown>,
  data: RssPayload,
): string[] {
  const max =
    typeof config.maxItems === 'number' && config.maxItems > 0
      ? Math.floor(config.maxItems)
      : 8
  return data.items.slice(0, max).map((item) => item.title)
}

function render(
  config: Record<string, unknown>,
  data: RssPayload | null,
  meta: AppDataMeta | null,
): void {
  if (!root) return
  if (!data || data.items.length === 0) {
    root.innerHTML = '<div class="center"><p>Loading headlines…</p></div>'
    return
  }
  const titles = clampItems(config, data)
  const rows = titles
    .map((title) => `<li class="rss-item">${escapeHtml(title)}</li>`)
    .join('')
  root.innerHTML = `
    <div class="rss">
      ${data.title ? `<div class="rss-head">${escapeHtml(data.title)}</div>` : ''}
      <ul class="rss-list">${rows}</ul>
    </div>
    ${freshnessFooterHtml(meta)}`
}

connectToHost<Record<string, unknown>, RssPayload>(({ config, data, meta }) => {
  render(config, data, meta)
})

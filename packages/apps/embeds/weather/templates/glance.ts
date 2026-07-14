import { dayStripHtml, metricsHtml, placeHtml } from '../chrome.js'
import type { WeatherContext, WeatherTemplate } from '../context.js'
import { escapeHtml } from '../format.js'
import './glance.css'

/**
 * "At a glance" — the temperature, the place, and the week under it.
 *
 * The plain one, and the one to reach for when nothing else fits: it never changes
 * shape, it reads at any distance, and it says everything a person walking past a
 * screen actually wants. The default for exactly that reason.
 *
 * Needs nothing beyond the base payload — no hours, no sunrise — so it is also the
 * layout that always works, including on a screen that has been offline since
 * before the connector fetched any of that.
 */
export const glanceTemplate: WeatherTemplate = {
  render(ctx: WeatherContext): string {
    const { data } = ctx

    return `
      <div class="wx-glance">
        <div class="wx-glance-top">
          <div class="wx-glance-now">
            ${placeHtml(ctx)}
            <div class="wx-glance-temp">${escapeHtml(ctx.temp(data.temperatureC))}</div>
            ${metricsHtml(ctx, ['feelsLike', 'precipitation', 'humidity', 'wind'])}
          </div>
          <div class="wx-glance-icon">${ctx.icon(data.weatherCode)}</div>
        </div>
        ${dayStripHtml(ctx)}
      </div>`
  },
}

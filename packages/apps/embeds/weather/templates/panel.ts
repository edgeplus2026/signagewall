import { hourStripHtml, metricsHtml, placeHtml, weekRowsHtml } from '../chrome.js'
import type { WeatherContext, WeatherTemplate } from '../context.js'
import { escapeHtml, longDateLabel } from '../format.js'
import './panel.css'

/**
 * "Panel" — every reading the app has, laid out to be read rather than admired.
 *
 * The dense one. Two columns: what it is doing now on the left, what it is going
 * to do on the right. For an office wall, a reception desk, a control room — the
 * places where somebody actually wants the numbers and is standing close enough to
 * read them.
 *
 * Degrades: the hourly strip drops out entirely on a payload that has no hours,
 * and the week grows into the space. Nothing shifts sideways.
 */
export const panelTemplate: WeatherTemplate = {
  render(ctx: WeatherContext): string {
    const { data, days } = ctx
    const today = days[0]

    return `
      <div class="wx-panel">
        <div class="wx-panel-now">
          ${placeHtml(ctx)}
          <div class="wx-panel-date">${escapeHtml(
            today ? longDateLabel(today.date, ctx.locale) : '',
          )}</div>

          <div class="wx-panel-hero">
            <div class="wx-panel-temp">${escapeHtml(ctx.temp(data.temperatureC))}</div>
            <div class="wx-panel-icon">${ctx.icon(data.weatherCode)}</div>
          </div>

          ${metricsHtml(ctx, ['feelsLike', 'precipitation', 'humidity', 'wind', 'uv'], {
            className: 'wx-panel-metrics',
          })}
        </div>

        <div class="wx-panel-next">
          ${hourStripHtml(ctx, 6)}
          <div class="wx-panel-week">
            <div class="wx-panel-heading">${escapeHtml(ctx.strings.theWeek)}</div>
            ${weekRowsHtml(ctx, 6)}
          </div>
        </div>
      </div>`
  },
}

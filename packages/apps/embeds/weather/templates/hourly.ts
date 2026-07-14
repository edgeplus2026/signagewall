import { dayStripHtml, metricsHtml, tempCurveHtml } from '../chrome.js'
import type { WeatherContext, WeatherTemplate } from '../context.js'
import { escapeHtml } from '../format.js'
import './hourly.css'

/**
 * "Hour by hour" — the next twelve hours as a curve, with the chance of rain
 * beneath it.
 *
 * The layout that answers the question people actually have. Nobody standing in a
 * lobby wants to know the temperature; they want to know whether to leave now or
 * in an hour, and a shape does that in a glance where a table of twelve numbers
 * never will.
 *
 * Degrades: an old cached payload has no hours at all, and there is no honest way
 * to fake a curve. It falls back to the six-day strip and says the same thing at a
 * coarser grain, rather than showing an empty frame where the point of the layout
 * used to be.
 */
export const hourlyTemplate: WeatherTemplate = {
  render(ctx: WeatherContext): string {
    const { data } = ctx

    const head = `
      <div class="wx-hourly-head">
        <div class="wx-hourly-now">
          <div class="wx-hourly-icon">${ctx.icon(data.weatherCode)}</div>
          <div>
            <div class="wx-hourly-temp">${escapeHtml(ctx.temp(data.temperatureC))}</div>
            <div class="wx-hourly-place">${escapeHtml(data.location)} · ${escapeHtml(
              ctx.condition(data.weatherCode),
            )}</div>
          </div>
        </div>
        ${metricsHtml(ctx, ['feelsLike', 'humidity', 'wind'])}
      </div>`

    const body =
      ctx.hours.length >= 2
        ? `
          <div class="wx-hourly-body">
            <div class="wx-hourly-heading">${escapeHtml(ctx.strings.hourByHour)}</div>
            ${tempCurveHtml(ctx, 12)}
          </div>`
        : `
          <div class="wx-hourly-body is-fallback">
            <div class="wx-hourly-heading">${escapeHtml(ctx.strings.theWeek)}</div>
            ${dayStripHtml(ctx)}
          </div>`

    return `<div class="wx-hourly">${head}${body}</div>`
  },
}

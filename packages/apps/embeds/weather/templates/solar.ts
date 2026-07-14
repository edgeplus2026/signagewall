import { metricsHtml, sunArcHtml } from '../chrome.js'
import type { WeatherContext, WeatherTemplate } from '../context.js'
import { escapeHtml } from '../format.js'
import './solar.css'

/**
 * "Daylight" — sunrise, now, sunset, on an arc.
 *
 * The calm one. It is the only layout in the app that shows the passage of the day
 * itself, and on a screen that somebody sits near all day — a café, a co-working
 * floor, a hotel lounge — that turns out to be the thing people look at. The sun
 * creeps along the arc over eight hours; you never catch it moving, and you always
 * know roughly where it is.
 *
 * The arc is honest about night: below the horizon there is no sun drawn, only the
 * track it will take tomorrow.
 *
 * Degrades: sunrise/sunset arrive with the daily forecast, but a payload cached
 * before the connector fetched them has neither. The arc then returns nothing, and
 * this layout falls back to the current conditions rather than rendering a header
 * over an empty middle.
 */
export const solarTemplate: WeatherTemplate = {
  render(ctx: WeatherContext): string {
    const { data } = ctx
    const arc = sunArcHtml(ctx)

    const head = `
      <div class="wx-solar-head">
        <div class="wx-solar-place">${escapeHtml(data.location)}</div>
        <div class="wx-solar-condition">
          <span class="wx-solar-icon">${ctx.icon(data.weatherCode)}</span>
          <span>${escapeHtml(ctx.condition(data.weatherCode))}</span>
          <span class="wx-solar-temp">${escapeHtml(ctx.temp(data.temperatureC))}</span>
        </div>
      </div>`

    // No sun times: say what we do know, big, instead of drawing an empty sky.
    if (arc === '') {
      return `
        <div class="wx-solar is-bare">
          ${head}
          <div class="wx-solar-bare">${ctx.icon(data.weatherCode)}</div>
          ${metricsHtml(ctx, ['feelsLike', 'precipitation', 'humidity', 'wind'])}
        </div>`
    }

    return `
      <div class="wx-solar">
        ${head}
        ${arc}
        ${metricsHtml(ctx, ['feelsLike', 'precipitation', 'humidity', 'wind'])}
      </div>`
  },
}

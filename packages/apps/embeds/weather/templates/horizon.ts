import { dayStripHtml, hourStripHtml } from '../chrome.js'
import type { WeatherContext, WeatherTemplate } from '../context.js'
import { escapeHtml } from '../format.js'
import './horizon.css'

/**
 * "Horizon" — the sky fills the screen and the numbers get out of its way.
 *
 * Everything is pushed to the bottom edge, so the top two thirds are nothing but
 * weather: the gradient, the drifting cloud, the rain, the stars. It is the layout
 * that makes the app's one big idea — the screen IS the weather — do the talking,
 * and it is the one to put in a lobby.
 *
 * Degrades: with no hourly data it falls back to the six-day strip, which every
 * payload has. The bottom rail is never empty.
 */
export const horizonTemplate: WeatherTemplate = {
  render(ctx: WeatherContext): string {
    const { data } = ctx

    // The hours are the better companion to a sky you are looking AT — "is this
    // going to hold?" is an hourly question. But an old cached payload has none,
    // and a layout may never require data it might not get.
    const rail =
      ctx.hours.length > 0
        ? hourStripHtml(ctx, 8)
        : dayStripHtml(ctx, 6, { showLow: false })

    return `
      <div class="wx-horizon">
        <div class="wx-horizon-sky">
          <div class="wx-horizon-icon">${ctx.icon(data.weatherCode)}</div>
        </div>

        <div class="wx-horizon-ground">
          <div class="wx-horizon-head">
            <div class="wx-horizon-text">
              <div class="wx-horizon-place">${escapeHtml(data.location)}</div>
              <div class="wx-horizon-condition">${escapeHtml(
                ctx.condition(data.weatherCode),
              )}</div>
            </div>
            <div class="wx-horizon-temp">${escapeHtml(ctx.temp(data.temperatureC))}</div>
          </div>
          ${rail}
        </div>
      </div>`
  },
}

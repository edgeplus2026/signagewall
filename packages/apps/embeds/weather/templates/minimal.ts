import type { WeatherContext, WeatherTemplate } from '../context.js'
import { escapeHtml, unitLabel } from '../format.js'
import './minimal.css'

/**
 * "Minimal" — the temperature, and nothing else.
 *
 * The restraint is the feature. On a screen at the end of a corridor, or above a
 * door, or anywhere it is read in one second by somebody who is walking, every
 * additional number is a cost. So: the place, the number, the word. That is all,
 * and the number is enormous.
 *
 * It is also the layout that carries the app's whole idea most cleanly — with
 * nothing on screen to look at, what you notice is the sky behind it, and the sky
 * IS the weather.
 *
 * Needs nothing but the base payload.
 */
export const minimalTemplate: WeatherTemplate = {
  render(ctx: WeatherContext): string {
    const { data } = ctx

    return `
      <div class="wx-minimal">
        <div class="wx-minimal-place">${escapeHtml(data.location)}</div>

        <div class="wx-minimal-temp">
          ${escapeHtml(ctx.temp(data.temperatureC))}<span class="wx-minimal-unit">${escapeHtml(
            unitLabel(ctx.imperial),
          )}</span>
        </div>

        <div class="wx-minimal-condition">
          <span class="wx-minimal-icon">${ctx.icon(data.weatherCode)}</span>
          <span>${escapeHtml(ctx.condition(data.weatherCode))}</span>
        </div>
      </div>`
  },
}

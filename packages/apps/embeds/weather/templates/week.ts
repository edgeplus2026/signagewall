import { weekRowsHtml } from '../chrome.js'
import type { WeatherContext, WeatherTemplate } from '../context.js'
import { escapeHtml } from '../format.js'
import './week.css'

/**
 * "The week" — seven days, every one of them measured against the same scale.
 *
 * The forecast IS the screen here; today's temperature is demoted to a line in the
 * header. The bars are the whole idea: because every row's track spans the same
 * range (the week's coldest low to its warmest high), the shape of the week is
 * legible before a single number is read — the cold snap is a bar sitting to the
 * left, the warm weekend is two bars sitting to the right.
 *
 * A table of fourteen numbers cannot do that, and it is what every other weather
 * app puts on a wall.
 *
 * Needs nothing but the base payload.
 */
export const weekTemplate: WeatherTemplate = {
  render(ctx: WeatherContext): string {
    const { data } = ctx

    return `
      <div class="wx-weekview">
        <div class="wx-weekview-head">
          <div class="wx-weekview-text">
            <div class="wx-weekview-place">${escapeHtml(data.location)}</div>
            <div class="wx-weekview-heading">${escapeHtml(ctx.strings.theWeek)}</div>
          </div>
          <div class="wx-weekview-now">
            <div class="wx-weekview-icon">${ctx.icon(data.weatherCode)}</div>
            <div class="wx-weekview-temp">${escapeHtml(ctx.temp(data.temperatureC))}</div>
          </div>
        </div>

        ${weekRowsHtml(ctx, 7)}
      </div>`
  },
}

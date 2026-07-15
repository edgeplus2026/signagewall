import type { WeatherContext, WeatherTemplate } from '../context.js'
import { dayLabel, escapeHtml, percent } from '../format.js'
import './agency.css'

/**
 * "Agency" — a weather desk on the evening news.
 *
 * The broadcast look, and the reference is deliberate: a lower third, a kicker, a
 * ticker of days running along the bottom. It is the visual language of weather,
 * and on a screen in a bar, a barbershop, a waiting room — anywhere with a
 * television-shaped hole in it — it belongs immediately.
 *
 * The ticker is a real marquee: the days scroll rather than sitting in cells, so
 * the strip reads as a channel rather than as a table. The list is DOUBLED in the
 * markup, which is the whole trick — the animation translates by exactly half the
 * track, so the second copy is under the cursor at the moment the first one leaves
 * and the loop has no seam.
 *
 * Needs nothing but the base payload.
 */
export const agencyTemplate: WeatherTemplate = {
  render(ctx: WeatherContext): string {
    const { data, days } = ctx

    const ticker = days
      .map((day, index) => {
        const pop = day.precipitationProbability
        const rain =
          pop !== undefined && pop >= 20
            ? `<span class="wx-agency-pop">${escapeHtml(percent(pop))}</span>`
            : ''
        return `
          <span class="wx-agency-item">
            <span class="wx-agency-day">${escapeHtml(
              dayLabel(day.date, index, ctx.locale, ctx.strings.today),
            )}</span>
            <span class="wx-agency-item-icon">${ctx.dayIcon(day.weatherCode)}</span>
            <span class="wx-agency-high">${escapeHtml(ctx.temp(day.maxC))}</span>
            <span class="wx-agency-low">${escapeHtml(ctx.temp(day.minC))}</span>
            ${rain}
          </span>`
      })
      .join('')

    return `
      <div class="wx-agency">
        <div class="wx-agency-stage">
          <div class="wx-agency-icon">${ctx.icon(data.weatherCode)}</div>
        </div>

        <div class="wx-agency-lower">
          <div class="wx-agency-kicker">${escapeHtml(ctx.strings.forecast)}</div>
          <div class="wx-agency-bar">
            <div class="wx-agency-place">${escapeHtml(data.location)}</div>
            <div class="wx-agency-condition">${escapeHtml(
              ctx.condition(data.weatherCode),
            )}</div>
            <div class="wx-agency-temp">${escapeHtml(ctx.temp(data.temperatureC))}</div>
          </div>

          <div class="wx-agency-ticker">
            <div class="wx-agency-track">
              ${ticker}${ticker}
            </div>
          </div>
        </div>
      </div>`
  },
}

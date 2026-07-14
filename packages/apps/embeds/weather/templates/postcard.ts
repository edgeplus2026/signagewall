import type { WeatherContext, WeatherTemplate } from '../context.js'
import { dayLabel, escapeHtml, longDateLabel } from '../format.js'
import './postcard.css'

/**
 * "Postcard" — the place, in big letters.
 *
 * A travel poster, not a dashboard. The place name is the artwork: it is set
 * enormous, it runs off the composition, and the weather arranges itself around it.
 * For a hotel lobby, an airport, a showroom — anywhere the point is WHERE you are
 * as much as what the sky is doing.
 *
 * It is the only layout where the temperature is not the largest thing on the
 * screen, and the only one that treats the location as a headline rather than a
 * label. That is the entire brief.
 *
 * Needs nothing but the base payload.
 */
export const postcardTemplate: WeatherTemplate = {
  render(ctx: WeatherContext): string {
    const { data, days } = ctx
    const today = days[0]

    // Three days, quietly, down the side. Any more and it stops being a poster.
    const strip = days
      .slice(1, 4)
      .map(
        (day, index) => `
          <div class="wx-postcard-day">
            <span class="wx-postcard-day-name">${escapeHtml(
              dayLabel(day.date, index + 1, ctx.locale, ctx.strings.today),
            )}</span>
            <span class="wx-postcard-day-icon">${ctx.dayIcon(day.weatherCode)}</span>
            <span class="wx-postcard-day-temp">${escapeHtml(ctx.temp(day.maxC))}</span>
          </div>`,
      )
      .join('')

    return `
      <div class="wx-postcard">
        <div class="wx-postcard-head">
          <div class="wx-postcard-date">${escapeHtml(
            today ? longDateLabel(today.date, ctx.locale) : '',
          )}</div>
          <div class="wx-postcard-icon">${ctx.icon(data.weatherCode)}</div>
        </div>

        <div class="wx-postcard-name">${escapeHtml(data.location)}</div>

        <div class="wx-postcard-foot">
          <div class="wx-postcard-now">
            <span class="wx-postcard-temp">${escapeHtml(ctx.temp(data.temperatureC))}</span>
            <span class="wx-postcard-condition">${escapeHtml(
              ctx.condition(data.weatherCode),
            )}</span>
          </div>
          <div class="wx-postcard-days">${strip}</div>
        </div>
      </div>`
  },
}

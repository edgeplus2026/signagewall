import type { WeatherContext, WeatherTemplate } from '../context.js'
import { compassPoint, dayLabel, escapeHtml, percent } from '../format.js'
import './tiles.css'

/**
 * "Tiles" — a board of cards.
 *
 * The bento grid, and the reason to have one: a screen that is walked PAST rather
 * than looked AT gets read in fragments, and a grid of self-contained cards survives
 * that. Whichever tile the eye lands on is a complete thought.
 *
 * The big tile is the current weather; the rest are one reading, or one day, each.
 * Every tile is the same object with the same padding and the same corner, which is
 * what stops a grid of unlike things from reading as clutter — only the SIZE varies,
 * and size is what carries the hierarchy.
 *
 * THE BOARD IS ALWAYS FULL, and that is the one genuinely awkward thing this layout
 * has to do. Two of the readings (feels-like and UV) are absent on a payload cached
 * before the connector fetched them, so the number of tiles is not known until run
 * time — and a bento grid with a hole in it looks like a bug, not like a design.
 *
 * The fix is to let the DAYS absorb the difference: the grid is a fixed twelve cells,
 * the big tile takes four, and however many readings we ended up with, the forecast
 * fills the rest. Five readings → three days. Three readings → five days. The board is
 * full either way, and nobody has to look at an empty square.
 */

/** The grid is 4×3 (see the CSS); the current-weather tile occupies 2×2 of it. */
const CELLS = 12
const NOW_TILE_CELLS = 4

export const tilesTemplate: WeatherTemplate = {
  render(ctx: WeatherContext): string {
    const { data, days, strings } = ctx

    /** One reading, in a tile. A reading with no data behind it produces nothing. */
    const tile = (label: string, value: string | null, note = ''): string => {
      if (value === null) {
        return ''
      }
      return `
        <div class="wx-tile">
          <div class="wx-tile-label">${escapeHtml(label)}</div>
          <div class="wx-tile-value">${escapeHtml(value)}</div>
          ${note ? `<div class="wx-tile-note">${escapeHtml(note)}</div>` : ''}
        </div>`
    }

    const feelsLike =
      data.feelsLikeC === undefined ? null : ctx.temp(data.feelsLikeC)
    const uv = days[0]?.uvIndexMax
    const windNote =
      data.windDegrees === undefined
        ? ''
        : compassPoint(data.windDegrees, strings)

    const readings = [
      tile(strings.feelsLike, feelsLike),
      tile(strings.rainChance, percent(data.precipitationProbability)),
      tile(strings.humidity, percent(data.humidity)),
      tile(strings.wind, ctx.wind(data.windKph), windNote),
      tile(strings.uv, uv === undefined ? null : String(Math.round(uv))),
    ].filter((html) => html !== '')

    // Whatever the readings left over. Never more days than we have (today is already
    // in the big tile, so the forecast starts at index 1), and never a negative count.
    const dayCount = Math.max(
      0,
      Math.min(CELLS - NOW_TILE_CELLS - readings.length, days.length - 1),
    )

    const dayTiles = days
      .slice(1, 1 + dayCount)
      .map(
        (day, index) => `
          <div class="wx-tile wx-tile-day">
            <div class="wx-tile-label">${escapeHtml(
              // `slice(1, …)` dropped today, so the original index is one higher — and
              // `dayLabel` only special-cases index 0. Passing a non-zero index is what
              // stops this calling Wednesday "Today".
              dayLabel(day.date, index + 1, ctx.locale, strings.today),
            )}</div>
            <div class="wx-tile-day-icon">${ctx.dayIcon(day.weatherCode)}</div>
            <div class="wx-tile-day-temps">
              <b>${escapeHtml(ctx.temp(day.maxC))}</b>
              <span>${escapeHtml(ctx.temp(day.minC))}</span>
            </div>
          </div>`,
      )
      .join('')

    return `
      <div class="wx-tiles">
        <div class="wx-tile wx-tile-now">
          <div class="wx-tile-now-text">
            <div class="wx-tile-place">${escapeHtml(data.location)}</div>
            <div class="wx-tile-temp">${escapeHtml(ctx.temp(data.temperatureC))}</div>
            <div class="wx-tile-condition">${escapeHtml(
              ctx.condition(data.weatherCode),
            )}</div>
          </div>
          <div class="wx-tile-now-icon">${ctx.icon(data.weatherCode)}</div>
        </div>

        ${readings.join('')}
        ${dayTiles}
      </div>`
  },
}

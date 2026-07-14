import type { WeatherHour } from '../../src/weather/payload.js'
import type { ConditionGroup } from './conditions.js'
import type { WeatherContext } from './context.js'
import {
  compassPoint,
  dayLabel,
  durationLabel,
  escapeHtml,
  hourLabel,
  parseLocal,
  percent,
  timeLabel,
} from './format.js'

/**
 * The furniture every layout wants, so template number ten doesn't start by
 * copying template number one's markup.
 *
 * These answer questions about the WEATHER and about the DATA — what is it doing
 * now, what does the week look like, when does the sun go down — not about any one
 * layout. Their base styling lives in `style.css`; a template restyles a piece by
 * nesting the selector under its own root class.
 *
 * Every one of them is defensive about missing data, and that is not paranoia: a
 * player caches the last payload it was handed, so a screen that has been offline
 * since before the connector learned to fetch hourly data is still rendering, right
 * now, a payload with no `hours` in it. The rule is that a missing series makes a
 * piece of furniture ABSENT, never broken — the function returns `''` and the
 * layout closes up around it.
 */

/* ----- The place, and what the weather is doing ----- */

/** "Belgrade" over "Partly cloudy" — the two lines every layout starts from. */
export function placeHtml(ctx: WeatherContext, withPreposition = false): string {
  const place = withPreposition
    ? `${ctx.strings.nowIn} ${ctx.data.location}`
    : ctx.data.location
  return `
    <div class="wx-place">
      <div class="wx-place-name">${escapeHtml(place)}</div>
      <div class="wx-condition">${escapeHtml(ctx.condition(ctx.data.weatherCode))}</div>
    </div>`
}

/* ----- The readings ----- */

export type MetricKey = 'feelsLike' | 'humidity' | 'wind' | 'precipitation' | 'uv'

/** One reading as a label and a value — the shape every metric layout wants. */
function metricValue(ctx: WeatherContext, key: MetricKey): string | null {
  const { data, strings } = ctx
  switch (key) {
    case 'feelsLike':
      // Absent on a payload cached before the connector fetched it — and this is
      // the ONE metric with a sane substitute, because "feels like" is only
      // interesting when it disagrees with the thermometer.
      return data.feelsLikeC === undefined ? null : ctx.temp(data.feelsLikeC)
    case 'humidity':
      return percent(data.humidity)
    case 'wind': {
      const speed = ctx.wind(data.windKph)
      if (data.windDegrees === undefined) {
        return speed
      }
      return `${speed} ${compassPoint(data.windDegrees, strings)}`
    }
    case 'precipitation':
      return percent(data.precipitationProbability)
    case 'uv': {
      const uv = ctx.days[0]?.uvIndexMax
      return uv === undefined ? null : String(Math.round(uv))
    }
  }
}

function metricLabel(ctx: WeatherContext, key: MetricKey, short: boolean): string {
  const { strings } = ctx
  switch (key) {
    case 'feelsLike':
      return strings.feelsLike
    case 'humidity':
      return strings.humidity
    case 'wind':
      return strings.wind
    case 'precipitation':
      return short ? strings.rainChance : strings.precipitation
    case 'uv':
      return strings.uv
  }
}

/**
 * The readings, as a row (or column) of label/value pairs. A metric with no data
 * behind it is dropped rather than shown empty — a screen reading "Feels like —"
 * is worse than a screen that simply doesn't mention it.
 */
export function metricsHtml(
  ctx: WeatherContext,
  keys: MetricKey[],
  options: { short?: boolean; className?: string } = {},
): string {
  const short = options.short ?? false
  const items = keys
    .map((key) => {
      const value = metricValue(ctx, key)
      if (value === null) {
        return ''
      }
      return `
        <div class="wx-metric">
          <div class="wx-metric-label">${escapeHtml(metricLabel(ctx, key, short))}</div>
          <div class="wx-metric-value">${escapeHtml(value)}</div>
        </div>`
    })
    .join('')

  if (items === '') {
    return ''
  }
  return `<div class="wx-metrics ${options.className ?? ''}">${items}</div>`
}

/* ----- The week ----- */

/** The forecast as a strip of cards: day, icon, high (and low). */
export function dayStripHtml(
  ctx: WeatherContext,
  count = 6,
  options: { showLow?: boolean } = {},
): string {
  const showLow = options.showLow ?? true
  const cards = ctx.days
    .slice(0, count)
    .map((day, index) => {
      const low = showLow
        ? `<div class="wx-day-low">${escapeHtml(ctx.temp(day.minC))}</div>`
        : ''
      return `
        <div class="wx-day">
          <div class="wx-day-name">${escapeHtml(dayLabel(day.date, index, ctx.locale, ctx.strings.today))}</div>
          <div class="wx-day-icon">${ctx.dayIcon(day.weatherCode)}</div>
          <div class="wx-day-temps">
            <div class="wx-day-high">${escapeHtml(ctx.temp(day.maxC))}</div>
            ${low}
          </div>
        </div>`
    })
    .join('')
  return `<div class="wx-days">${cards}</div>`
}

/**
 * The week as rows, each with a bar spanning that day's low to its high, all of
 * them measured against the SAME scale — the coldest low and the warmest high of
 * the week. That shared scale is the entire point: it is what turns seven pairs of
 * numbers into a shape you can read from the back of a room, where Thursday is
 * visibly the cold one and the weekend is visibly the warm one.
 */
export function weekRowsHtml(ctx: WeatherContext, count = 7): string {
  const days = ctx.days.slice(0, count)
  if (days.length === 0) {
    return ''
  }

  const lows = days.map((day) => day.minC)
  const highs = days.map((day) => day.maxC)
  const floor = Math.min(...lows)
  const ceiling = Math.max(...highs)
  // A week with no spread at all (every day identical) would divide by zero. Give
  // it a nominal range so the bars render as centred stubs instead of vanishing.
  const span = ceiling - floor || 1

  const rows = days
    .map((day, index) => {
      const left = ((day.minC - floor) / span) * 100
      const width = ((day.maxC - day.minC) / span) * 100
      const pop = day.precipitationProbability
      const rain =
        pop !== undefined && pop >= 20
          ? `<span class="wx-week-pop">${escapeHtml(percent(pop))}</span>`
          : ''
      return `
        <div class="wx-week-row">
          <div class="wx-week-name">${escapeHtml(dayLabel(day.date, index, ctx.locale, ctx.strings.today))}</div>
          <div class="wx-week-icon">${ctx.dayIcon(day.weatherCode)}</div>
          <div class="wx-week-low">${escapeHtml(ctx.temp(day.minC))}</div>
          <div class="wx-week-track">
            <span class="wx-week-bar" style="left:${left.toFixed(1)}%;width:${Math.max(width, 2).toFixed(1)}%"></span>
          </div>
          <div class="wx-week-high">${escapeHtml(ctx.temp(day.maxC))}</div>
          <div class="wx-week-rain">${rain}</div>
        </div>`
    })
    .join('')

  return `<div class="wx-week">${rows}</div>`
}

/* ----- The hours ----- */

/** The next hours as a strip: hour, icon, temperature. */
export function hourStripHtml(ctx: WeatherContext, count = 8): string {
  const hours = ctx.hours.slice(0, count)
  if (hours.length === 0) {
    return ''
  }
  const cells = hours
    .map((hour, index) => {
      const label = index === 0 ? ctx.strings.now : hourLabel(hour.time)
      return `
        <div class="wx-hour">
          <div class="wx-hour-time">${escapeHtml(label)}</div>
          <div class="wx-hour-icon">${ctx.icon(hour.weatherCode, hour.isDay ?? ctx.isDay)}</div>
          <div class="wx-hour-temp">${escapeHtml(ctx.temp(hour.temperatureC))}</div>
        </div>`
    })
    .join('')
  return `<div class="wx-hours">${cells}</div>`
}

/**
 * Curve geometry. The viewBox is `width × 100`, so a y-coordinate IS a percentage
 * of the plot's height — which is what lets the HTML overlay below place its dots at
 * exactly the same points the SVG drew, with no shared scaling code.
 *
 * The padding keeps the warmest hour clear of the top edge (its label sits above it)
 * and the coldest clear of the axis.
 */
const CURVE = { step: 100, padTop: 26, padBottom: 16 } as const

/**
 * The temperature curve — the next N hours as a line, with the chance of rain
 * beneath it.
 *
 * The line is a smooth path rather than a polyline, because a temperature that
 * climbs through an afternoon IS a curve, and a jagged one reads as noisy data
 * rather than as a warm day.
 *
 * WHY THE DOTS AND LABELS ARE HTML AND NOT SVG. The curve's SVG is stretched to its
 * container (`preserveAspectRatio: none`) — that is the only way one path fills a
 * landscape wall and a portrait pillar without recomputing anything. But a
 * non-uniform stretch distorts EVERYTHING in the SVG's coordinate system: circles
 * come out as ellipses (they did — the dots were visibly egg-shaped) and text comes
 * out squashed. `vector-effect: non-scaling-stroke` rescues the line's stroke and
 * nothing else.
 *
 * So only the two paths live in the stretched SVG. The dots and their labels are
 * plain HTML, positioned in PERCENTAGES over the same box — which the viewBox's
 * `× 100` height makes a direct copy of the SVG's own y-coordinates, and which no
 * amount of stretching can distort.
 */
export function tempCurveHtml(ctx: WeatherContext, count = 12): string {
  const hours = ctx.hours.slice(0, count)
  if (hours.length < 2) {
    return ''
  }

  const temps = hours.map((hour) => hour.temperatureC)
  const low = Math.min(...temps)
  const high = Math.max(...temps)
  // A perfectly flat night (every hour the same) would divide by zero; a nominal
  // span parks the line down the middle of the band instead.
  const span = high - low || 1

  const width = (hours.length - 1) * CURVE.step
  const usable = 100 - CURVE.padTop - CURVE.padBottom
  const points = temps.map((temp, index) => ({
    x: index * CURVE.step,
    y: CURVE.padTop + (1 - (temp - low) / span) * usable,
  }))

  const line = smoothPath(points)
  // Close the area down to the baseline and back — `100` is the viewBox's floor.
  const area = `${line} L ${width} 100 L 0 100 Z`

  const dots = points
    .map((point, index) => {
      const temp = temps[index]
      if (temp === undefined) {
        return ''
      }
      // `x / width` rather than `index / (count - 1)`: same number, but it stays
      // right if the step ever changes.
      const left = (point.x / width) * 100
      return `
        <span class="wx-curve-point" style="left:${left.toFixed(2)}%;top:${point.y.toFixed(2)}%">
          <b>${escapeHtml(ctx.temp(temp))}</b>
        </span>`
    })
    .join('')

  return `
    <div class="wx-curve">
      <div class="wx-curve-plot">
        <svg class="wx-curve-svg" viewBox="0 0 ${width} 100" preserveAspectRatio="none">
          <path class="wx-curve-area" d="${area}"/>
          <path class="wx-curve-line" d="${line}"/>
        </svg>
        <div class="wx-curve-points">${dots}</div>
      </div>
      ${hourAxisHtml(ctx, hours)}
    </div>`
}

/** A path through the points, rounded at every turn. */
function smoothPath(points: Array<{ x: number; y: number }>): string {
  const first = points[0]
  if (first === undefined) {
    return ''
  }
  let path = `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`
  for (let i = 1; i < points.length; i += 1) {
    const previous = points[i - 1]
    const point = points[i]
    if (previous === undefined || point === undefined) {
      continue
    }
    const midX = (previous.x + point.x) / 2
    path += ` C ${midX.toFixed(1)} ${previous.y.toFixed(1)}, ${midX.toFixed(1)} ${point.y.toFixed(1)}, ${point.x.toFixed(1)} ${point.y.toFixed(1)}`
  }
  return path
}

/** The hour ticks under the curve, with the chance of rain where there is any. */
function hourAxisHtml(ctx: WeatherContext, hours: WeatherHour[]): string {
  const cells = hours
    .map((hour, index) => {
      const pop = hour.precipitationProbability ?? 0
      // Below a fifth, "chance of rain" is noise — every hour would carry a number
      // and the row would stop meaning anything.
      const rain =
        pop >= 20
          ? `<div class="wx-axis-rain"><span class="wx-axis-drop"></span>${escapeHtml(percent(pop))}</div>`
          : '<div class="wx-axis-rain"></div>'
      return `
        <div class="wx-axis-cell">
          ${rain}
          <div class="wx-axis-hour">${escapeHtml(index === 0 ? ctx.strings.now : hourLabel(hour.time))}</div>
        </div>`
    })
    .join('')
  return `<div class="wx-axis">${cells}</div>`
}

/* ----- The sun ----- */

/** Minutes from midnight, for a `Date` in the payload's zoneless frame. */
function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

/**
 * Sunrise → now → sunset, on an arc.
 *
 * The sun's position is its progress through the daylight, not through the day, so
 * the arc's midpoint is solar noon and the dot sits where the sun actually is.
 * Outside daylight the dot parks at the horizon it last crossed and the arc reads
 * as spent — a screen at midnight should not draw a sun hanging in the sky.
 *
 * Returns '' when the payload predates sunrise/sunset (an old cached snapshot);
 * the layout that wants this has to survive without it.
 */
export function sunArcHtml(ctx: WeatherContext): string {
  const today = ctx.days[0]
  const sunriseIso = today?.sunrise
  const sunsetIso = today?.sunset
  if (sunriseIso === undefined || sunsetIso === undefined) {
    return ''
  }

  const sunrise = parseLocal(sunriseIso)
  const sunset = parseLocal(sunsetIso)
  if (!sunrise || !sunset) {
    return ''
  }

  const riseMinutes = minutesOfDay(sunrise)
  const setMinutes = minutesOfDay(sunset)
  const nowMinutes = minutesOfDay(ctx.now)
  const daylight = Math.max(1, setMinutes - riseMinutes)

  const progress = Math.min(1, Math.max(0, (nowMinutes - riseMinutes) / daylight))
  const isUp = nowMinutes >= riseMinutes && nowMinutes <= setMinutes

  // The arc: a half-circle from (0,100) to (200,100), peaking at (100,0). The sun
  // rides it by angle, so the dot's path is the drawn line rather than an
  // approximation of it.
  const angle = Math.PI * progress
  const x = 100 - Math.cos(angle) * 100
  const y = 100 - Math.sin(angle) * 100

  // The arc's length, so `stroke-dasharray` can fill exactly the elapsed part.
  const arcLength = Math.PI * 100
  const elapsed = arcLength * progress

  const remaining = isUp
    ? `<div class="wx-sun-left"><b>${escapeHtml(durationLabel(setMinutes - nowMinutes))}</b> ${escapeHtml(ctx.strings.daylightLeft)}</div>`
    : `<div class="wx-sun-left">${escapeHtml(ctx.strings.daylight)} · ${escapeHtml(durationLabel(daylight))}</div>`

  return `
    <div class="wx-sun${isUp ? ' is-up' : ''}">
      <svg class="wx-sun-svg" viewBox="-14 -14 228 128">
        <path class="wx-sun-track" d="M 0 100 A 100 100 0 0 1 200 100"/>
        <path class="wx-sun-elapsed" d="M 0 100 A 100 100 0 0 1 200 100"
              style="stroke-dasharray:${elapsed.toFixed(1)} ${arcLength.toFixed(1)};--wx-arc:${elapsed.toFixed(1)}"/>
        <line class="wx-sun-horizon" x1="-10" y1="100" x2="210" y2="100"/>
        <circle class="wx-sun-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="11"/>
      </svg>
      <div class="wx-sun-ends">
        <div class="wx-sun-end">
          <div class="wx-sun-label">${escapeHtml(ctx.strings.sunrise)}</div>
          <div class="wx-sun-time">${escapeHtml(timeLabel(sunriseIso))}</div>
        </div>
        <div class="wx-sun-end">
          <div class="wx-sun-label">${escapeHtml(ctx.strings.sunset)}</div>
          <div class="wx-sun-time">${escapeHtml(timeLabel(sunsetIso))}</div>
        </div>
      </div>
      ${remaining}
    </div>`
}

/* ----- Weather in the air ----- */

/** Deterministic pseudo-random, so a particle field doesn't restart every render. */
function scatter(index: number, salt: number): number {
  return ((Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453) % 1 + 1) % 1
}

/**
 * The weather itself, drifting across the screen behind the layout — rain that
 * falls, snow that drifts, clouds that cross, lightning that flashes.
 *
 * This is the difference between a screen that reports the weather and a screen
 * that IS the weather, and it costs nothing: every particle is a `transform` on a
 * handful of elements, which is the one thing the cheap Android sticks these run on
 * can do at 60fps all day. The counts stay deliberately low for exactly that
 * reason, the field is composited on its own layer, and `main.ts` pauses the lot
 * while the app is preloaded off-screen.
 *
 * Positions come from a seeded scatter rather than `Math.random()` so a re-render
 * (the operator nudging a setting in the CMS) doesn't teleport every drop.
 */
export function ambienceHtml(group: ConditionGroup, isDay: boolean): string {
  switch (group) {
    case 'rain':
    case 'drizzle': {
      const count = group === 'rain' ? 18 : 10
      const drops = Array.from({ length: count }, (_unused, i) => {
        const left = scatter(i, 1) * 100
        const delay = scatter(i, 2) * 1.4
        const duration = 0.7 + scatter(i, 3) * 0.5
        const height = 8 + scatter(i, 4) * 8
        return `<span class="wx-rain-drop" style="left:${left.toFixed(1)}%;animation-delay:${delay.toFixed(2)}s;animation-duration:${duration.toFixed(2)}s;height:${height.toFixed(1)}vh"></span>`
      }).join('')
      return `<div class="wx-ambience wx-ambience-rain" aria-hidden="true">${drops}</div>`
    }

    case 'snow': {
      const flakes = Array.from({ length: 22 }, (_unused, i) => {
        const left = scatter(i, 5) * 100
        const delay = scatter(i, 6) * 6
        const duration = 6 + scatter(i, 7) * 6
        const size = 0.4 + scatter(i, 8) * 0.7
        return `<span class="wx-snow-flake" style="left:${left.toFixed(1)}%;animation-delay:${delay.toFixed(2)}s;animation-duration:${duration.toFixed(2)}s;width:${size.toFixed(2)}vh;height:${size.toFixed(2)}vh"></span>`
      }).join('')
      return `<div class="wx-ambience wx-ambience-snow" aria-hidden="true">${flakes}</div>`
    }

    case 'thunder':
      // The flash is the whole screen, briefly. It is on a long, irregular cycle —
      // a storm that strobes on a metronome reads as a broken display.
      return `
        <div class="wx-ambience wx-ambience-thunder" aria-hidden="true">
          <span class="wx-flash"></span>
        </div>`

    case 'cloudy':
    case 'fog':
    case 'partly': {
      const clouds = Array.from({ length: 3 }, (_unused, i) => {
        const top = 4 + scatter(i, 9) * 46
        const delay = scatter(i, 10) * -80
        const duration = 90 + scatter(i, 11) * 70
        const scale = 0.7 + scatter(i, 12) * 0.8
        return `<span class="wx-cloud-drift" style="top:${top.toFixed(1)}%;animation-delay:${delay.toFixed(1)}s;animation-duration:${duration.toFixed(1)}s;transform:scale(${scale.toFixed(2)})"></span>`
      }).join('')
      return `<div class="wx-ambience wx-ambience-cloud" aria-hidden="true">${clouds}</div>`
    }

    case 'clear':
      // Nothing falls out of a clear sky. By day the sky itself is the effect; by
      // night, a few stars — the one case where "no ambience" would look empty.
      if (isDay) {
        return ''
      }
      return `
        <div class="wx-ambience wx-ambience-stars" aria-hidden="true">
          ${Array.from({ length: 40 }, (_unused, i) => {
            const left = scatter(i, 13) * 100
            const top = scatter(i, 14) * 70
            const delay = scatter(i, 15) * 4
            const size = 1 + scatter(i, 16) * 2
            return `<span class="wx-star" style="left:${left.toFixed(1)}%;top:${top.toFixed(1)}%;animation-delay:${delay.toFixed(2)}s;width:${size.toFixed(1)}px;height:${size.toFixed(1)}px"></span>`
          }).join('')}
        </div>`
  }
}

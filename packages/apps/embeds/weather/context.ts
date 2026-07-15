import type {
  WeatherDaily,
  WeatherHour,
  WeatherPayload,
} from '../../src/weather/payload.js'
import type { ConditionGroup } from './conditions.js'
import type { Strings } from './i18n.js'
import type { Sky } from './sky.js'

/**
 * What a template is handed.
 *
 * It lives in its own file rather than in the template registry (where the RSS
 * app keeps the equivalent) for one reason: `chrome.ts` takes this context too,
 * and the registry imports the templates, which import the chrome. Putting the
 * type in the registry would close that loop.
 *
 * Note what is NOT in here: raw colours. The sky is on the app root, and every
 * template picks it up through `currentColor` and the `--wx-*` properties. `sky`
 * is exposed only for the handful of decisions that CSS genuinely cannot make —
 * and if a template is reading `sky.accent` into a style attribute, it is almost
 * certainly reinventing `var(--wx-accent)`.
 *
 * Everything here is resolved and synchronous. Units are already applied by
 * `temp()` / `wind()`; a template never converts a temperature, and never sees a
 * Fahrenheit anything.
 */
export interface WeatherContext {
  data: WeatherPayload
  /** The upcoming days, today first. At most six; never empty in practice. */
  days: WeatherDaily[]
  /**
   * The upcoming hours, the current one first. At most 24, and EMPTY on a payload
   * cached before the connector fetched hourly data — a template that needs hours
   * must say what it does without them.
   */
  hours: WeatherHour[]
  /** The current weather's kind — what the sky, the icon and the ambience key off. */
  group: ConditionGroup
  /** Daylight at the forecast place. Not at the player. */
  isDay: boolean
  sky: Sky
  strings: Strings
  /** The `Intl` locale (`sr-Latn`, `en`) — for day names and the like. */
  locale: string
  /** The instance's language key (`sr`, `en`). */
  lang: string
  imperial: boolean
  /**
   * The wall clock AT THE FORECAST PLACE — in the same zoneless frame as the
   * payload's timestamps, so it compares directly against `sunrise` and an hour's
   * `time`. See `placeNow()` in `format.ts`; do not substitute `new Date()`.
   */
  now: Date

  /** A temperature in the instance's units, e.g. `21°`. */
  temp: (celsius: number) => string
  /** A wind speed in the instance's units, e.g. `9 km/h`. */
  wind: (kph: number) => string
  /** What a WMO code means, in the instance's language. */
  condition: (code: number) => string
  /**
   * The icon for a WMO code, defaulting to the CURRENT daylight.
   *
   * That default is right for the weather happening now and wrong for everything else,
   * so the two other cases have to say so:
   *   - an HOUR passes its own `isDay` (9pm tomorrow is dark even if now is not)
   *   - a DAY passes `true` — always. A forecast for Saturday is about a whole day, and
   *     rendering the week with moons on it just because the sun happens to be down
   *     right now says the sun will not rise on Saturday. Use {@link dayIcon}.
   */
  icon: (code: number, isDay?: boolean) => string
  /** The icon for a whole day's forecast. Never a moon — see {@link WeatherContext.icon}. */
  dayIcon: (code: number) => string
}

export interface WeatherTemplate {
  render(ctx: WeatherContext): string
}

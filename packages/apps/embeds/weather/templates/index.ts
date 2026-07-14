import type { WeatherDisplayMode } from '../../../src/weather/display-modes.js'
import type { WeatherTemplate } from '../context.js'
import { agencyTemplate } from './agency.js'
import { glanceTemplate } from './glance.js'
import { horizonTemplate } from './horizon.js'
import { hourlyTemplate } from './hourly.js'
import { minimalTemplate } from './minimal.js'
import { panelTemplate } from './panel.js'
import { postcardTemplate } from './postcard.js'
import { solarTemplate } from './solar.js'
import { tilesTemplate } from './tiles.js'
import { weekTemplate } from './week.js'

/**
 * The layout registry. One entry per value in `WEATHER_DISPLAY_MODES`
 * (`src/weather/display-modes.ts`) — and because {@link TEMPLATES} is typed
 * `Record<WeatherDisplayMode, WeatherTemplate>`, adding a mode to that list
 * without a template here is a type error, not a blank screen on a wall
 * somewhere.
 *
 * Adding a layout:
 *   1. add `{ value: 'aurora', label: '…' }` to WEATHER_DISPLAY_MODES
 *   2. write `templates/aurora.ts` exporting a WeatherTemplate (+ its own CSS)
 *   3. add `aurora: auroraTemplate` below
 *
 * Templates are pure and synchronous: a context in (see `../context.ts`), HTML
 * out. They own no colours — the sky is on the app root and they inherit it — and
 * they own no data handling: units, language and the place's clock are all already
 * resolved by the time a template sees them.
 *
 * The one rule that isn't obvious: A LAYOUT MAY NOT REQUIRE DATA IT MIGHT NOT GET.
 * A player caches the last payload it was handed, so a screen that has been
 * offline since before the connector learned to fetch hourly data is still, right
 * now, rendering a payload with no `hours` in it. Every layout that leans on
 * `ctx.hours` or on sunrise/sunset says here, in its own file, what it does
 * without them.
 */

const TEMPLATES: Record<WeatherDisplayMode, WeatherTemplate> = {
  glance: glanceTemplate,
  horizon: horizonTemplate,
  panel: panelTemplate,
  hourly: hourlyTemplate,
  week: weekTemplate,
  solar: solarTemplate,
  minimal: minimalTemplate,
  agency: agencyTemplate,
  tiles: tilesTemplate,
  postcard: postcardTemplate,
}

/** The layout used when the config names none, or names one we don't ship. */
export const DEFAULT_MODE: WeatherDisplayMode = 'glance'

/**
 * The template for a config's `displayMode`. Falls back to the default rather
 * than trusting the value: an instance saved against a newer manifest (or an older
 * one whose layout we since dropped) must still render something.
 */
export function templateFor(mode: unknown): WeatherTemplate {
  const key = typeof mode === 'string' ? mode : ''
  const lookup: Record<string, WeatherTemplate | undefined> = TEMPLATES
  return lookup[key] ?? TEMPLATES[DEFAULT_MODE]
}

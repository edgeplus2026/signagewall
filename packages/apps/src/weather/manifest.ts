import type { AppManifest } from '@edge/apps-contract'

import {
  DEFAULT_WEATHER_MODE,
  weatherDisplayModeOptions,
} from './display-modes.js'

const WEATHER_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 13a5 5 0 10-9.9 1H5a3 3 0 000 6h11a4 4 0 000-8z"/></svg>'

/**
 * Weather — a flagship `server` app. The backend connector fetches the forecast
 * (Open-Meteo, no API key) once per coarse location and fans it out to every
 * instance sharing that location, so 100 "Weather / Belgrade" screens cost one
 * upstream call per refresh. The connector returns neutral data (°C + raw
 * numbers); the embed bundle formats it per the instance config (units, etc.).
 *
 * `displayMode` is the app's spine: the layouts live in `display-modes.ts` and
 * each has a template behind it in the embed. Adding one must not touch this file
 * beyond the list it already reads.
 *
 * Deliberately few knobs, and note which ones are ABSENT: there are no background
 * / text / accent colour fields. The screen's palette is the weather — a clear
 * afternoon is blue, a thunderstorm is slate, and at night every one of them goes
 * dark, because the app knows whether the sun is up AT THE PLACE. Handing that to
 * an operator as three colour pickers would only let them freeze the screen on a
 * sunny blue that lies all through the night.
 */
export const weatherManifest: AppManifest = {
  slug: 'weather',
  name: 'Weather',
  tagline: 'Live local weather on your screens',
  description:
    'Show the current weather and a short forecast for any city — updated automatically.',
  runtimeKind: 'embed',
  dataSource: 'server',
  version: 3,
  refreshSeconds: 900,
  icon: WEATHER_ICON,
  color: '#38BDF8',
  configSchema: [
    {
      key: 'location',
      type: 'location',
      label: 'Location',
      required: true,
      placeholder: 'Search a city…',
      help: 'Start typing and pick a place from the list. The forecast follows it.',
    },
    {
      key: 'displayMode',
      type: 'select',
      label: 'Layout',
      help: 'How the weather is arranged on the screen.',
      default: DEFAULT_WEATHER_MODE,
      options: weatherDisplayModeOptions(),
    },
    {
      key: 'theme',
      type: 'select',
      label: 'Theme',
      // "Weather" is the default and the one worth explaining: an operator who
      // sees a colour list expects to pick a colour, and needs telling that the
      // first option is the screen changing on its own — otherwise the first
      // thunderstorm reads as a fault.
      help: 'Weather: the screen takes its colours from the sky — blue in clear weather, grey in rain, dark at night.',
      default: 'auto',
      options: [
        { label: 'Weather (follows the sky)', value: 'auto' },
        { label: 'Light', value: 'light' },
        { label: 'Dark', value: 'dark' },
      ],
    },
    {
      key: 'units',
      type: 'select',
      label: 'Temperature units',
      section: 'Weather Settings',
      default: 'metric',
      options: [
        { label: 'Celsius (°C)', value: 'metric' },
        { label: 'Fahrenheit (°F)', value: 'imperial' },
      ],
    },
    {
      key: 'language',
      type: 'select',
      label: 'Language',
      section: 'Weather Settings',
      // A bare "Language" reads as the CMS's own language. Say which one it is.
      help: "The language the weather is shown in on the screen. It doesn't change this page.",
      default: 'en',
      options: [
        { label: 'English', value: 'en' },
        { label: 'Serbian', value: 'sr' },
      ],
    },
    {
      key: 'showClock',
      type: 'switch',
      label: 'Show the time',
      section: 'Weather Settings',
      help: 'A small clock in the corner. It also proves the screen is live rather than frozen.',
      default: true,
    },
  ],
}

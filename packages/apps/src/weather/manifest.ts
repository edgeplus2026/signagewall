import type { AppManifest } from '@edge/apps-contract'

const WEATHER_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 13a5 5 0 10-9.9 1H5a3 3 0 000 6h11a4 4 0 000-8z"/></svg>'

/**
 * Weather — a flagship `server` app. The backend connector fetches the forecast
 * (Open-Meteo, no API key) once per coarse location and fans it out to every
 * instance sharing that location, so 100 "Weather / Belgrade" screens cost one
 * upstream call per refresh. The connector returns neutral data (°C + raw
 * numbers); the embed bundle formats it per the instance config (units, etc.).
 */
export const weatherManifest: AppManifest = {
  slug: 'weather',
  name: 'Weather',
  tagline: 'Live local weather on your screens',
  description:
    'Show the current weather and a short forecast for any city — updated automatically.',
  runtimeKind: 'embed',
  dataSource: 'server',
  version: 2,
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
      key: 'units',
      type: 'select',
      label: 'Temperature units',
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
      // A bare "Language" reads as the CMS's own language. Say which one it is.
      help: "The language the weather is shown in on the screen. It doesn't change this page.",
      default: 'en',
      options: [
        { label: 'English', value: 'en' },
        { label: 'Serbian', value: 'sr' },
      ],
    },
  ],
}

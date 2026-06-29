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
  version: 1,
  refreshSeconds: 900,
  icon: WEATHER_ICON,
  color: '#38BDF8',
  configSchema: [
    {
      key: 'location',
      type: 'text',
      label: 'City',
      required: true,
      help: 'e.g. Belgrade',
      placeholder: 'Belgrade',
    },
    {
      key: 'units',
      type: 'select',
      label: 'Units',
      default: 'metric',
      options: [
        { label: 'Celsius (°C)', value: 'metric' },
        { label: 'Fahrenheit (°F)', value: 'imperial' },
      ],
    },
  ],
}

import type { AppManifest } from '@edge/apps-contract'

const FX_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h13l-3-3M21 17H8l3 3"/></svg>'

/**
 * Exchange rate — a `server` app. The backend connector fetches rates once per
 * base currency (`fx:<base>`) from a free, key-less provider and fans them out.
 * Rates are returned raw against the base; the embed bundle picks/formats the
 * quote currencies per the instance config.
 */
export const fxManifest: AppManifest = {
  slug: 'fx',
  name: 'Exchange rates',
  tagline: 'Show live currency exchange rates',
  description:
    'Display up-to-date exchange rates for the currencies your audience cares about.',
  runtimeKind: 'embed',
  dataSource: 'server',
  version: 1,
  refreshSeconds: 3600,
  icon: FX_ICON,
  color: '#22C55E',
  configSchema: [
    {
      key: 'base',
      type: 'text',
      label: 'Base currency',
      required: true,
      default: 'EUR',
      help: 'ISO code, e.g. EUR, USD, RSD',
      placeholder: 'EUR',
    },
    {
      key: 'quotes',
      type: 'text',
      label: 'Show currencies',
      required: true,
      default: 'USD,GBP,CHF',
      help: 'Comma-separated ISO codes',
      placeholder: 'USD,GBP,CHF',
    },
  ],
}

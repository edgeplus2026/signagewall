import type { AppManifest } from '@edge/apps-contract'

import { styleFields } from '../_shared/style-fields.js'
import { coinOptions } from './coins.js'

const CRYPTO_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 8h4a2 2 0 0 1 0 4h-4h4.5a2 2 0 0 1 0 4H9.5"/><path d="M10 8V6M10 18v-2M12.5 8V6M12.5 18v-2"/></svg>'

/**
 * Crypto prices — a `server` app backed by CoinGecko's free price endpoint (no
 * API key). The connector fetches once per coin-set + currency and fans it out,
 * so many screens cost one call. CoinGecko's free tier is rate-limited, so the
 * refresh is a conservative 5 minutes; the coarse cache key keeps calls to one
 * per distinct board regardless of how many screens show it.
 */
export const cryptoManifest: AppManifest = {
  slug: 'crypto',
  name: 'Crypto prices',
  tagline: 'Live cryptocurrency prices',
  description:
    'Show live prices for the coins you choose, in your currency, with the 24-hour change.',
  runtimeKind: 'embed',
  dataSource: 'server',
  version: 1,
  refreshSeconds: 300,
  icon: CRYPTO_ICON,
  color: '#F59E0B',
  configSchema: [
    {
      key: 'coins',
      type: 'multiselect',
      label: 'Coins',
      help: 'Which coins to show. They appear in a consistent order.',
      default: ['bitcoin', 'ethereum'],
      validation: { min: 1, max: 12 },
      options: coinOptions(),
    },
    {
      key: 'vs',
      type: 'select',
      label: 'Currency',
      help: 'The currency prices are shown in.',
      default: 'usd',
      options: [
        { label: 'US dollar (USD)', value: 'usd' },
        { label: 'Euro (EUR)', value: 'eur' },
        { label: 'British pound (GBP)', value: 'gbp' },
        { label: 'Danish krone (DKK)', value: 'dkk' },
      ],
    },
    {
      key: 'showChange',
      type: 'switch',
      label: 'Show 24-hour change',
      default: true,
    },
    {
      key: 'theme',
      type: 'select',
      label: 'Theme',
      default: 'dark',
      options: [
        { label: 'Light', value: 'light' },
        { label: 'Dark', value: 'dark' },
      ],
    },
    ...styleFields(),
  ],
}

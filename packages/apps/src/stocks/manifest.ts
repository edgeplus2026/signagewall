import type { AppManifest } from '@edge/apps-contract'

import { styleFields } from '../_shared/style-fields.js'

const STOCKS_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18 9 12l4 3 7-8"/><path d="M20 11V7h-4"/></svg>'

/**
 * Stocks — a `server` app showing live quotes for a set of tickers via Alpaca.
 * Unlike the keyless apps, this one needs Alpaca market-data credentials in the
 * backend (`ALPACA_API_KEY_ID` + `ALPACA_API_SECRET_KEY`) — see enabler E5.
 * Alpaca is chosen for its commercial-friendly terms (its free tier serves IEX
 * data). Without the credentials the connector fails cleanly and the screen holds
 * its last quotes rather than going blank.
 *
 * Tickers are entered as repeater rows (one `symbol` per row). The connector
 * fetches once per ticker set under a coarse cache key and fans it out.
 */
export const stocksManifest: AppManifest = {
  slug: 'stocks',
  name: 'Stocks',
  tagline: 'Live stock prices on your screens',
  description:
    'Show live prices and daily change for the stock tickers you choose. Requires Alpaca market-data credentials configured by your administrator.',
  runtimeKind: 'embed',
  dataSource: 'server',
  version: 1,
  refreshSeconds: 300,
  icon: STOCKS_ICON,
  color: '#10B981',
  configSchema: [
    {
      key: 'symbols',
      type: 'repeater',
      label: 'Tickers',
      help: 'Add a ticker per row, e.g. AAPL, MSFT, TSLA. Shown in a consistent order.',
      required: true,
      validation: { min: 1 },
      fields: [
        {
          key: 'symbol',
          type: 'text',
          label: 'Ticker',
          required: true,
          placeholder: 'AAPL',
        },
      ],
    },
    {
      key: 'showChange',
      type: 'switch',
      label: 'Show daily change',
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

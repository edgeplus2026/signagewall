import type {
  AppConnector,
  ConnectorContext,
  ConnectorResult,
} from '@signagewall/apps-contract';
import { holidayCountryName } from '@signagewall/apps';
import type { Holiday, HolidaysPayload } from '@signagewall/apps';

interface HolidaysConfig {
  country?: string;
  // `count` is display-only (how many the bundle shows); not in the cacheKey.
  count?: number;
}

/** Nager.Date — open public-holiday data, no API key. */
const NAGER_API = 'https://date.nager.at/api/v3/NextPublicHolidays';

/** Store a generous window; the bundle shows the operator's `count` from it. */
const MAX_STORED = 12;

function countryOf(config: HolidaysConfig): string {
  return (config.country ?? 'DK').trim().toUpperCase() || 'DK';
}

interface NagerHoliday {
  date: string;
  localName: string;
  name: string;
}

/**
 * Public-holidays connector (`server`). Country-only cache key, so every screen
 * for a country shares one fetch. Returns the upcoming holidays soonest-first;
 * no fetch timestamp, so the list fans out only when it actually changes.
 */
export const holidaysConnector: AppConnector<HolidaysConfig, HolidaysPayload> =
  {
    cacheKey(config) {
      return `holidays:${countryOf(config)}`;
    },

    async fetchData(
      config: HolidaysConfig,
      ctx: ConnectorContext,
    ): Promise<ConnectorResult<HolidaysPayload>> {
      const country = countryOf(config);
      const response = await fetch(
        `${NAGER_API}/${encodeURIComponent(country)}`,
        ctx.signal ? { signal: ctx.signal } : {},
      );
      if (!response.ok) {
        throw new Error(`holidays upstream ${response.status}`);
      }
      const body = (await response.json()) as NagerHoliday[];
      if (!Array.isArray(body)) {
        throw new Error('holidays: unexpected response');
      }

      const holidays: Holiday[] = body.slice(0, MAX_STORED).map((entry) => ({
        date: entry.date,
        name: entry.name,
        localName: entry.localName,
      }));
      if (holidays.length === 0) {
        throw new Error('holidays: none returned');
      }

      ctx.logger.debug('holidays fetched', { country, count: holidays.length });
      return {
        playerPayload: {
          country,
          countryName: holidayCountryName(country),
          holidays,
        },
      };
    },
  };

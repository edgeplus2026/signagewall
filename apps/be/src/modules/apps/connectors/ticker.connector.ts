import { createHash } from 'node:crypto';

import type {
  AppConnector,
  ConnectorContext,
  ConnectorResult,
} from '@signagewall/apps-contract';
import { ConnectorError } from '@signagewall/apps-contract';
import type { TickerPayload } from '@signagewall/apps';

import { rssConnector } from './rss.connector';

interface TickerConfig {
  /** 'messages' (operator rows) or 'rss' (live headlines). */
  source?: string;
  rssUrl?: string;
  /** Repeater rows; a legacy one-per-line string is also accepted. */
  messages?: Array<{ message?: unknown }> | string;
}

/**
 * Ticker connector: resolves the band's message list from whichever source the
 * instance is configured with. RSS mode delegates to the RSS connector (SSRF
 * guard + battle-tested feed parsing) and keeps only the headlines; messages
 * mode simply normalizes the operator's rows into the same payload, so the
 * embed renders one shape either way.
 */
export const tickerConnector: AppConnector<TickerConfig, TickerPayload> = {
  cacheKey(config) {
    if (isRss(config)) {
      // Not shared with the `rss` app (different payload shape), but ticker
      // instances pointed at the same feed do share one fetch.
      return `ticker:rss:${sha1((config.rssUrl ?? '').trim().toLowerCase())}`;
    }
    // Message mode is config-derived: key on the content so identical bands
    // share an entry and any edit rolls to a fresh one.
    return `ticker:msg:${sha1(JSON.stringify(configMessages(config)))}`;
  },

  async fetchData(
    config: TickerConfig,
    ctx: ConnectorContext,
  ): Promise<ConnectorResult<TickerPayload>> {
    if (isRss(config)) {
      const url = (config.rssUrl ?? '').trim();
      if (!url) {
        throw new ConnectorError('config_invalid', 'ticker: missing rss url');
      }
      const result = await rssConnector.fetchData({ url }, ctx);
      const messages = (result.playerPayload?.items ?? [])
        .map((item) => item.title.trim())
        .filter((title) => title.length > 0);
      // An empty feed is a failure, not an empty band: keep the last good
      // payload scrolling and record the error for the operator.
      if (messages.length === 0) {
        throw new Error('ticker: feed has no headlines');
      }
      return { playerPayload: { messages } };
    }
    return { playerPayload: { messages: configMessages(config) } };
  },
};

function isRss(config: TickerConfig): boolean {
  return config.source === 'rss';
}

/** Non-empty, trimmed messages from repeater rows or the legacy string form. */
function configMessages(config: TickerConfig): string[] {
  const value = config.messages;
  if (Array.isArray(value)) {
    return value
      .map((row) =>
        typeof row?.message === 'string' ? row.message.trim() : '',
      )
      .filter((message) => message.length > 0);
  }
  return (typeof value === 'string' ? value : '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function sha1(value: string): string {
  return createHash('sha1').update(value).digest('hex');
}

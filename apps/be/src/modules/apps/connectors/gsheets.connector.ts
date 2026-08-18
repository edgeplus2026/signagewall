import type {
  AppConnector,
  ConnectorContext,
  ConnectorResult,
} from '@signagewall/apps-contract';
import { ConnectorError } from '@signagewall/apps-contract';
import type { GsheetsPayload } from '@signagewall/apps';

import { ensureDriveChannel } from './_shared/drive-watch';

interface GsheetsConfig {
  connectionId?: string;
  /** The chosen spreadsheet: { id, label } from the `remote-select` picker. */
  spreadsheet?: { id?: string; label?: string } | string;
  /** Only ever set by instances configured before the field was removed. */
  range?: string;
  // `layout` / `showHeader` are display-only (the bundle applies them); the
  // same cells are fetched either way, so neither belongs in the cache key.
  layout?: string;
  showHeader?: boolean;
}

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

/** Resolve the chosen spreadsheet id from config ({ id } or a legacy string). */
function spreadsheetIdOf(config: GsheetsConfig): string {
  const value = config.spreadsheet;
  const id = typeof value === 'string' ? value : (value?.id ?? '');
  return id.trim();
}

/**
 * Columns A–Z of the first sheet, capped at 100 rows.
 *
 * Unqualified so Google resolves it against the first tab, which is where a
 * spreadsheet picked from a list almost always keeps its data. The cap is not
 * about the display — a wall shows a dozen rows at most — but about not pulling
 * a ten-thousand-row sheet every five minutes to throw it away.
 *
 * Instances configured while the field still existed keep their own range until
 * they are next saved — config validation strips keys the schema no longer
 * declares, so the first save after this change moves them onto the default.
 */
const DEFAULT_RANGE = 'A1:Z100';

function rangeOf(config: GsheetsConfig): string {
  return (config.range ?? '').trim() || DEFAULT_RANGE;
}

/**
 * Google Sheets connector (`connected`). Like other connected apps its cache key
 * is PER-CONNECTION (a sheet is private) and also includes the spreadsheet id and
 * the range (the range changes the data); `layout`/`showHeader` are display-only.
 * Reads the range with the resolved account's access token and normalizes the
 * cells to strings — Google omits trailing empty cells, so rows can be ragged and
 * the bundle pads them.
 */
export const gsheetsConnector: AppConnector<GsheetsConfig, GsheetsPayload> = {
  oauth: {
    provider: 'google',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/spreadsheets.readonly',
    ],
  },

  // Self-subscribes to Google Drive `files.watch` on the chosen spreadsheet so an
  // edit reaches the screen in seconds (the same push the menu board uses). The
  // poll cadence stays as the floor that keeps the channel renewed.
  webhookPath: 'webhooks/google/drive',

  cacheKey(config) {
    const connectionId = config.connectionId ?? 'none';
    return `gsheets:${connectionId}:${spreadsheetIdOf(config) || 'none'}:${rangeOf(config)}`;
  },

  async fetchData(
    config: GsheetsConfig,
    ctx: ConnectorContext,
  ): Promise<ConnectorResult<GsheetsPayload>> {
    if (!ctx.connection) {
      throw new Error('gsheets: no connection resolved');
    }
    const spreadsheetId = spreadsheetIdOf(config);
    if (!spreadsheetId) {
      throw new ConnectorError(
        'config_invalid',
        'gsheets: missing spreadsheet',
      );
    }
    const range = rangeOf(config);

    const url =
      `${SHEETS_API}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}` +
      `?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE`;
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${ctx.connection.accessToken}` },
      ...(ctx.signal ? { signal: ctx.signal } : {}),
    });
    if (!response.ok) {
      throw new Error(`gsheets upstream ${response.status}`);
    }
    const body = (await response.json()) as {
      values?: Array<Array<string | number | boolean | null>>;
    };

    const values: string[][] = (body.values ?? []).map((row) =>
      row.map((cell) =>
        cell === null || cell === undefined ? '' : String(cell),
      ),
    );

    const title =
      (typeof config.spreadsheet === 'object'
        ? config.spreadsheet?.label
        : '') || 'Google Sheet';

    // Keep the Drive push channel alive so a sheet edit reaches screens in
    // seconds; never fails the fetch (see drive-watch.ts) — undefined webhookUrl
    // (no public callback) just means the poll cadence carries the data.
    const channel = await ensureDriveChannel(spreadsheetId, ctx);

    ctx.logger.debug('gsheets fetched', { spreadsheetId, rows: values.length });
    return {
      playerPayload: { title, values },
      ...(channel ? { secrets: { channel } } : {}),
    };
  },
};

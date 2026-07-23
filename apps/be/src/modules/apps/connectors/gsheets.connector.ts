import type {
  AppConnector,
  ConnectorContext,
  ConnectorResult,
} from '@edge/apps-contract';
import type { GsheetsPayload } from '@edge/apps';

import { ensureDriveChannel } from './_shared/drive-watch';

interface GsheetsConfig {
  connectionId?: string;
  /** The chosen spreadsheet: { id, label } from the `remote-select` picker. */
  spreadsheet?: { id?: string; label?: string } | string;
  range?: string;
  // `layout` / `hasHeader` are display-only (the bundle applies them); not in the key.
  layout?: string;
  hasHeader?: boolean;
}

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

/** Resolve the chosen spreadsheet id from config ({ id } or a legacy string). */
function spreadsheetIdOf(config: GsheetsConfig): string {
  const value = config.spreadsheet;
  const id = typeof value === 'string' ? value : (value?.id ?? '');
  return id.trim();
}

function rangeOf(config: GsheetsConfig): string {
  return (config.range ?? '').trim();
}

/**
 * Google Sheets connector (`connected`). Like other connected apps its cache key
 * is PER-CONNECTION (a sheet is private) and also includes the spreadsheet id and
 * the range (the range changes the data); `layout`/`hasHeader` are display-only.
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
      'https://www.googleapis.com/auth/drive.metadata.readonly',
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
      throw new Error('gsheets: missing spreadsheet');
    }
    const range = rangeOf(config);
    if (!range) {
      throw new Error('gsheets: missing range');
    }

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
      row.map((cell) => (cell === null || cell === undefined ? '' : String(cell))),
    );

    const title =
      (typeof config.spreadsheet === 'object' ? config.spreadsheet?.label : '') ||
      'Google Sheet';

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

import type {
  AppConnector,
  ConnectorContext,
  ConnectorResult,
} from '@edge/apps-contract';
import type { MenuItem, MenuSyncPayload } from '@edge/apps';

import { fetchSheetTable } from '../../connections/providers/google-api';
import {
  fetchWorkbookTable,
  unpackDriveItem,
} from '../../connections/providers/graph-api';
import {
  MAX_TABULAR_ROWS,
  applyColumnMapping,
  hashMapping,
  parsePriceNumber,
  type TabularTable,
} from './_shared/tabular/apply-mapping';
import { ensureDriveChannel } from './_shared/drive-watch';

interface MenuConfig {
  connectionId?: string;
  /** 'manual' | 'gsheets' | 'excel' — the tabular source select. */
  source?: string;
  /** The picked Google spreadsheet: { id, label }. */
  spreadsheet?: { id?: string; label?: string };
  /** The picked Excel workbook: { id: "driveId|itemId", label }. */
  workbook?: { id?: string; label?: string };
  worksheet?: string;
  /** target field → sheet header name. */
  mapping?: Record<string, string>;
}

function fileIdOf(config: MenuConfig): string {
  const file = config.source === 'excel' ? config.workbook : config.spreadsheet;
  return (file?.id ?? '').trim();
}

function fileLabelOf(config: MenuConfig): string {
  const file = config.source === 'excel' ? config.workbook : config.spreadsheet;
  return (file?.label ?? '').trim();
}

/** Whether this config actually syncs (vs the manual/static modes). */
function isSynced(config: MenuConfig): boolean {
  return (
    (config.source === 'gsheets' || config.source === 'excel') &&
    typeof config.connectionId === 'string' &&
    config.connectionId !== '' &&
    fileIdOf(config) !== ''
  );
}

/** A mapped row → normalized menu item; rows with no name are dropped. */
function toMenuItem(record: Record<string, string>): MenuItem | null {
  const name = (record.name ?? '').trim();
  if (!name) return null;
  const item: MenuItem = { name };
  if (record.price !== undefined) {
    // Parsed number formats with the instance currency; a cell with no number
    // in it ("ask us") stays verbatim text.
    item.price = parsePriceNumber(record.price) ?? record.price;
  }
  if (record.description) item.description = record.description;
  if (record.category) item.category = record.category;
  if (record.imageUrl) item.imageUrl = record.imageUrl;
  return item;
}

/**
 * Menu board connector (`connected`, optional auth). In `manual` mode the items
 * live in the instance config and this connector is INERT: `cacheKey` returns
 * '' so the scheduler skips the instance and the snapshot carries no `data` —
 * the embed then reads the config rows, exactly like a static app.
 *
 * In `gsheets`/`excel` mode it reads the sheet as displayed text (Sheets values
 * API / Graph Workbook API), applies the operator's column mapping, and returns
 * normalized items the embed renders as-is. Sheets additionally self-subscribes
 * to a Drive `files.watch` push channel (see `drive-watch.ts`); Excel push runs
 * through the externally-orchestrated Graph subscription (`webhookResource`).
 * Push is the accelerator; the 900 s poll is the floor.
 */
export const menuConnector: AppConnector<MenuConfig, MenuSyncPayload> = {
  oauth: [
    {
      provider: 'google',
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: [
        'https://www.googleapis.com/auth/drive.metadata.readonly',
        'https://www.googleapis.com/auth/spreadsheets.readonly',
      ],
    },
    {
      provider: 'microsoft',
      authorizationUrl:
        'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      // Read-only. Files.Read.All covers OneDrive; Sites.Read.All covers
      // files shared from SharePoint. `offline_access` etc. added by provider.
      scopes: ['Files.Read.All', 'Sites.Read.All'],
    },
  ],

  webhookPath: 'webhooks/google/drive',

  webhookResource(config) {
    if (config.source !== 'excel') return null;
    const packed = (config.workbook?.id ?? '').trim();
    return packed ? { provider: 'microsoft', packedDriveItem: packed } : null;
  },

  cacheKey(config) {
    if (!isSynced(config)) {
      // Manual mode: no fetch, no cache entry, no `data` in the snapshot.
      return '';
    }
    const worksheet = (config.worksheet ?? '').trim() || 'first';
    // The mapping shapes the payload, so it must shape the key too — otherwise
    // two instances of the same sheet with different mappings would share (and
    // fight over) one cache entry.
    return `menu:${config.source}:${config.connectionId}:${fileIdOf(config)}:${worksheet}:${hashMapping(config.mapping)}`;
  },

  async fetchData(
    config: MenuConfig,
    ctx: ConnectorContext,
  ): Promise<ConnectorResult<MenuSyncPayload>> {
    if (!ctx.connection) {
      throw new Error('menu: no connection resolved');
    }
    if (!isSynced(config)) {
      throw new Error('menu: not configured for sync');
    }
    const worksheet = (config.worksheet ?? '').trim();

    let table: TabularTable;
    let secrets: Record<string, unknown> | undefined;

    if (config.source === 'excel') {
      const unpacked = unpackDriveItem(fileIdOf(config));
      if (!unpacked) {
        throw new Error('menu: invalid workbook id');
      }
      table = await fetchWorkbookTable(
        ctx.connection.accessToken,
        unpacked.driveId,
        unpacked.itemId,
        worksheet,
        MAX_TABULAR_ROWS,
        ctx.signal,
      );
    } else {
      const spreadsheetId = fileIdOf(config);
      table = await fetchSheetTable(
        ctx.connection.accessToken,
        spreadsheetId,
        worksheet,
        MAX_TABULAR_ROWS,
        ctx.signal,
      );
      // Keep the Drive push channel alive so a sheet edit reaches screens in
      // seconds; never fails the fetch (see drive-watch.ts).
      const channel = await ensureDriveChannel(spreadsheetId, ctx);
      if (channel) {
        secrets = { channel };
      }
    }

    const items = applyColumnMapping(table, config.mapping ?? {})
      .map(toMenuItem)
      .filter((item): item is MenuItem => item !== null);

    ctx.logger.debug('menu fetched', {
      source: config.source,
      rows: table.rows.length,
      items: items.length,
    });

    const title = fileLabelOf(config);
    return {
      playerPayload: { items, ...(title ? { sourceTitle: title } : {}) },
      ...(secrets ? { secrets } : {}),
    };
  },
};

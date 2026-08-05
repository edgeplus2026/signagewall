import type {
  AppConnector,
  ConnectorContext,
  ConnectorResult,
} from '@signagewall/apps-contract';
import type {
  OpsBoardConfig,
  OpsBoardPayload,
  OpsBoardRow,
} from '@signagewall/apps';
import { fetchSheetTable } from '../../connections/providers/google-api';
import {
  fetchWorkbookTable,
  unpackDriveItem,
} from '../../connections/providers/graph-api';
import {
  MAX_TABULAR_ROWS,
  applyColumnMapping,
  hashMapping,
  type TabularTable,
} from './_shared/tabular/apply-mapping';
import { ensureDriveChannel } from './_shared/drive-watch';
import { normalizeOpsBoardStatus } from './_shared/tabular/opsboard-status';

type RuntimeOpsBoardConfig = Partial<OpsBoardConfig>;

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function fileIdOf(config: RuntimeOpsBoardConfig): string {
  const file = config.source === 'excel' ? config.workbook : config.spreadsheet;
  return clean(file?.id);
}

function fileLabelOf(config: RuntimeOpsBoardConfig): string {
  const file = config.source === 'excel' ? config.workbook : config.spreadsheet;
  return clean(file?.label);
}

function isSynced(config: RuntimeOpsBoardConfig): boolean {
  return (
    (config.source === 'gsheets' || config.source === 'excel') &&
    clean(config.connectionId) !== '' &&
    fileIdOf(config) !== ''
  );
}

interface SortableRow {
  row: OpsBoardRow;
  index: number;
  sortOrder?: number;
}

function toSortableRow(
  record: Record<string, string>,
  index: number,
): SortableRow | null {
  const label = clean(record.label);
  if (!label) return null;

  const row: OpsBoardRow = {
    label,
    status: normalizeOpsBoardStatus(record.status),
  };
  const primary = clean(record.primary);
  const secondary = clean(record.secondary);
  const note = clean(record.note);
  const group = clean(record.group);
  if (primary) row.primary = primary;
  if (secondary) row.secondary = secondary;
  if (note) row.note = note;
  if (group) row.group = group;

  const rawOrder = clean(record.sortOrder);
  const sortOrder = rawOrder === '' ? undefined : Number(rawOrder);
  return {
    row,
    index,
    ...(sortOrder !== undefined && Number.isFinite(sortOrder)
      ? { sortOrder }
      : {}),
  };
}

function normalizeRows(
  table: TabularTable,
  mapping: Record<string, string>,
): OpsBoardRow[] {
  return applyColumnMapping(table, mapping)
    .map(toSortableRow)
    .filter((item): item is SortableRow => item !== null)
    .sort((a, b) => {
      if (a.sortOrder === undefined && b.sortOrder === undefined)
        return a.index - b.index;
      if (a.sortOrder === undefined) return 1;
      if (b.sortOrder === undefined) return -1;
      return a.sortOrder - b.sortOrder || a.index - b.index;
    })
    .map(({ row }) => row);
}

/**
 * OpsBoard is inert in manual mode. Connected sources use displayed cell text,
 * a connection-scoped cache key, provider push notifications and polling.
 */
export const opsboardConnector: AppConnector<
  RuntimeOpsBoardConfig,
  OpsBoardPayload
> = {
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
      scopes: ['Files.Read.All', 'Sites.Read.All'],
    },
  ],

  webhookPath: 'webhooks/google/drive',

  webhookResource(config) {
    if (config.source !== 'excel') return null;
    const packed = fileIdOf(config);
    return packed ? { provider: 'microsoft', packedDriveItem: packed } : null;
  },

  cacheKey(config) {
    if (!isSynced(config)) return '';
    const worksheet = clean(config.worksheet) || 'first';
    return `opsboard:${config.source}:${clean(config.connectionId)}:${fileIdOf(config)}:${worksheet}:${hashMapping(config.mapping)}`;
  },

  async fetchData(
    config: RuntimeOpsBoardConfig,
    ctx: ConnectorContext,
  ): Promise<ConnectorResult<OpsBoardPayload>> {
    if (!isSynced(config)) {
      throw new Error('opsboard: not configured for sync');
    }
    if (!ctx.connection) {
      throw new Error('opsboard: no connection resolved');
    }

    const expectedProvider = config.source === 'excel' ? 'microsoft' : 'google';
    if (ctx.connection.provider !== expectedProvider) {
      throw new Error(
        `opsboard: ${config.source} requires a ${expectedProvider} connection`,
      );
    }

    const worksheet = clean(config.worksheet);
    let table: TabularTable;
    let secrets: Record<string, unknown> | undefined;

    if (config.source === 'excel') {
      const unpacked = unpackDriveItem(fileIdOf(config));
      if (!unpacked) throw new Error('opsboard: invalid workbook id');
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
      const channel = await ensureDriveChannel(spreadsheetId, ctx);
      if (channel) secrets = { channel };
    }

    const rows = normalizeRows(table, config.mapping ?? {});
    const sourceTitle = fileLabelOf(config);

    ctx.logger.debug('opsboard fetched', {
      source: config.source,
      rows: table.rows.length,
      normalizedRows: rows.length,
    });

    return {
      playerPayload: {
        rows,
        ...(sourceTitle ? { sourceTitle } : {}),
      },
      ...(secrets ? { secrets } : {}),
    };
  },
};

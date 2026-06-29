import type {
  AppConnector,
  ConnectorContext,
  ConnectorResult,
} from '@edge/apps-contract';
import type { OneDrivePayload } from '@edge/apps';

interface OneDriveConfig {
  connectionId?: string;
  itemId?: string;
}

const GRAPH_DRIVE_ITEM = 'https://graph.microsoft.com/v1.0/me/drive/items';

/**
 * OneDrive document connector (`connected`, Microsoft). Per-connection cache key
 * (a file is private). `fetchData` resolves a short-lived, pre-authenticated
 * `@microsoft.graph.downloadUrl` so the player loads the file directly without
 * the access token. Updates are pushed live by the Graph webhook on the item.
 */
export const onedriveConnector: AppConnector<OneDriveConfig, OneDrivePayload> =
  {
    oauth: {
      provider: 'microsoft',
      authorizationUrl:
        'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      scopes: ['Files.Read', 'offline_access'],
    },

    cacheKey(config) {
      const connectionId = config.connectionId ?? 'none';
      const itemId = (config.itemId ?? '').trim() || 'none';
      return `onedrive:${connectionId}:${itemId}`;
    },

    async fetchData(
      config: OneDriveConfig,
      ctx: ConnectorContext,
    ): Promise<ConnectorResult<OneDrivePayload>> {
      if (!ctx.connection) {
        throw new Error('onedrive: no connection resolved');
      }
      const itemId = (config.itemId ?? '').trim();
      if (!itemId) {
        throw new Error('onedrive: missing itemId');
      }

      const response = await fetch(
        `${GRAPH_DRIVE_ITEM}/${encodeURIComponent(itemId)}`,
        {
          headers: { authorization: `Bearer ${ctx.connection.accessToken}` },
          ...(ctx.signal ? { signal: ctx.signal } : {}),
        },
      );
      if (!response.ok) {
        throw new Error(`onedrive upstream ${response.status}`);
      }
      const item = (await response.json()) as {
        name?: string;
        eTag?: string;
        cTag?: string;
        file?: { mimeType?: string };
        ['@microsoft.graph.downloadUrl']?: string;
      };

      const url = item['@microsoft.graph.downloadUrl'];
      if (!url) {
        throw new Error('onedrive: no download url');
      }
      const mime = item.file?.mimeType ?? '';

      ctx.logger.debug('onedrive fetched', { itemId });
      return {
        playerPayload: {
          name: item.name ?? 'Document',
          url,
          kind: mime.startsWith('image/') ? 'image' : 'embed',
          fetchedAt: new Date().toISOString(),
        },
        // The download URL rotates every fetch; key change-detection on the
        // file's content tag so we only fan out when the document changes.
        ...((item.cTag ?? item.eTag)
          ? { version: item.cTag ?? item.eTag }
          : {}),
      };
    },
  };

import { randomUUID } from 'node:crypto';

import type { ConnectorContext } from '@signagewall/apps-contract';

/**
 * Google Drive `files.watch` push channels for file-backed connectors (Google
 * Sheets, the menu board's Sheets sync, Google Slides — anything whose source is
 * a Drive file). Modeled on the calendar connector's
 * `ensureChannel`: the channel lives in the connector's cache `secrets` under
 * `channel` (which `AppDataCacheRepository.findByChannelId` queries, so the
 * `/webhooks/google/drive` route resolves a ping to its cache key), and the
 * POLL is what keeps the push alive — Drive channels expire after hours, not
 * weeks, so every fetch re-registers once the channel is inside
 * {@link RENEW_BEFORE_MS} of dying.
 *
 * Never throws into the fetch: a sheet that can't be watched (no public URL, a
 * scope Google won't grant for this file, a rate limit) must still be READ —
 * a stale-by-minutes screen beats a blank one.
 */

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const CHANNELS_STOP_API = `${DRIVE_API}/channels/stop`;

/**
 * Re-register once the channel is inside this of its expiry. Two poll cadences
 * (2 × 900 s), so a renewal can miss a tick and still beat the expiry.
 */
const RENEW_BEFORE_MS = 30 * 60 * 1000;

export interface DriveWatchChannel {
  id: string;
  resourceId: string;
  /** Epoch ms, as Google returns it. */
  expiration: number;
  /** The callback this channel was registered against. */
  address: string;
}

function readChannel(
  secrets: Record<string, unknown> | undefined,
): DriveWatchChannel | undefined {
  const channel = secrets?.channel as Partial<DriveWatchChannel> | undefined;
  if (
    !channel ||
    typeof channel.id !== 'string' ||
    typeof channel.resourceId !== 'string' ||
    typeof channel.expiration !== 'number' ||
    typeof channel.address !== 'string'
  ) {
    return undefined;
  }
  return channel as DriveWatchChannel;
}

/**
 * Keep a Drive push channel alive for this file; returns what to persist under
 * `secrets.channel` (or undefined when this deployment can't be pushed to).
 */
export async function ensureDriveChannel(
  fileId: string,
  ctx: ConnectorContext,
): Promise<DriveWatchChannel | undefined> {
  const address = ctx.webhookUrl;
  const existing = readChannel(ctx.secrets);

  // No public address: this deployment can't be pushed to. Keep polling.
  if (!address) {
    return undefined;
  }

  // Alive, and registered against the address we would use now (a changed
  // public URL must re-register, or pings go to the old host until expiry).
  if (
    existing &&
    existing.address === address &&
    existing.expiration - Date.now() > RENEW_BEFORE_MS
  ) {
    return existing;
  }

  try {
    const id = randomUUID();
    const response = await fetch(
      `${DRIVE_API}/files/${encodeURIComponent(fileId)}/watch`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${ctx.connection?.accessToken ?? ''}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ id, type: 'web_hook', address }),
        ...(ctx.signal ? { signal: ctx.signal } : {}),
      },
    );
    if (!response.ok) {
      // The status alone is not actionable — a 403 here is almost always one of
      // two very different things, and Google only says which in the body:
      //   "Unauthorized WebHook callback channel: <address>"
      //       → the callback DOMAIN is not verified for this Cloud project.
      //         Expected on any tunnel/host you don't own (see OPERATOR.md §5).
      //   an insufficient-scope message
      //       → `files.watch` wants more than the connector asked for.
      // Read the body best-effort; polling carries the data either way.
      const detail = await response
        .text()
        .then((text) => text.slice(0, 300))
        .catch(() => '');
      ctx.logger.warn('drive watch failed', {
        fileId,
        status: response.status,
        detail,
      });
      return existing;
    }
    const body = (await response.json()) as {
      resourceId?: string;
      expiration?: string;
    };
    if (!body.resourceId) {
      return existing;
    }

    const channel: DriveWatchChannel = {
      id,
      resourceId: body.resourceId,
      expiration: Number(body.expiration ?? 0),
      address,
    };

    // Retire the replaced channel so it doesn't keep pinging until natural
    // expiry (each ping costs a fetch). Best-effort.
    if (existing) {
      void fetch(CHANNELS_STOP_API, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${ctx.connection?.accessToken ?? ''}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          id: existing.id,
          resourceId: existing.resourceId,
        }),
      }).catch(() => undefined);
    }

    ctx.logger.debug('drive watching', {
      fileId,
      expiresIn: channel.expiration - Date.now(),
    });
    return channel;
  } catch (error) {
    ctx.logger.warn('drive watch errored', {
      fileId,
      error: error instanceof Error ? error.message : String(error),
    });
    return existing;
  }
}

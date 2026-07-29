import { createHash } from 'node:crypto';

import type {
  AppConnector,
  ConnectorContext,
  ConnectorResult,
} from '@signagewall/apps-contract';
import type { PowerPointPayload } from '@signagewall/apps';

import { unpackDriveItem } from '../../connections/providers/graph-api';
import {
  type PptxRenderer,
  getPptxRenderer,
} from './powerpoint/pptx-renderer.registry';

const GRAPH_DRIVES_URL = 'https://graph.microsoft.com/v1.0/drives';

interface PowerPointConfig {
  connectionId?: string;
  /** The chosen deck: { id: "driveId|itemId", label } from the picker. */
  presentation?: { id?: string; label?: string };
}

/** Persisted (server-only) state of the last render, carried via `secrets`. */
interface RenderedState {
  /** Content tag (cTag/eTag) of the deck when it was rendered. */
  version: string;
  /** R2 object keys of the rendered slides, in order. */
  slideKeys: string[];
  name: string;
}

/**
 * PowerPoint connector (`connected`, Microsoft). Per-connection cache key (a
 * file is private). On change it renders the deck to WebP slides on R2 (via the
 * DI-bridged {@link PptxRenderer}) and returns their public URLs; the embed
 * shows them as a static slideshow. Change-detection keys on the file's content
 * tag (`cTag`/`eTag`) — the `version` — so we only re-render and fan out when the
 * deck actually changes. Updates are pushed live by the Graph webhook on the
 * item; polling (`refreshSeconds`) is the fallback.
 *
 * Rendering runs synchronously inside the fetch, so the connector overrides the
 * default fetch budget with a generous `timeoutMs`. Renders are rare (only on a
 * content-tag change), so occupying one scheduler slot for the duration is fine.
 */
export const powerpointConnector: AppConnector<
  PowerPointConfig,
  PowerPointPayload
> = {
  oauth: {
    provider: 'microsoft',
    authorizationUrl:
      'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    // Read-only. Files.Read.All covers OneDrive; Sites.Read.All covers
    // SharePoint. `offline_access`/`openid`/`email` are added by the provider.
    scopes: ['Files.Read.All', 'Sites.Read.All'],
  },

  timeoutMs: 180_000,

  cacheKey(config) {
    const connectionId = config.connectionId ?? 'none';
    const presentationId = (config.presentation?.id ?? '').trim() || 'none';
    return `powerpoint:${connectionId}:${presentationId}`;
  },

  // Which drive item the external Graph subscription orchestrator should watch
  // for this config (`AppInstancesService.ensureWebhookSubscription`).
  webhookResource(config) {
    const packed = (config.presentation?.id ?? '').trim();
    return packed ? { provider: 'microsoft', packedDriveItem: packed } : null;
  },

  async fetchData(
    config: PowerPointConfig,
    ctx: ConnectorContext,
  ): Promise<ConnectorResult<PowerPointPayload>> {
    if (!ctx.connection) {
      throw new Error('powerpoint: no connection resolved');
    }
    const packed = (config.presentation?.id ?? '').trim();
    if (!packed) {
      throw new Error('powerpoint: no presentation selected');
    }
    const unpacked = unpackDriveItem(packed);
    if (!unpacked) {
      throw new Error('powerpoint: invalid presentation id');
    }
    const { driveId, itemId } = unpacked;

    const renderer = getPptxRenderer();
    if (!renderer) {
      // Render service not registered yet (very early boot). Retry next tick.
      return { pending: true };
    }
    if (!renderer.isConfigured()) {
      throw new Error('powerpoint: slide storage (R2) is not configured');
    }

    const accessToken = ctx.connection.accessToken;
    const label = config.presentation?.label ?? 'Presentation';

    // Cheap metadata read: content tag (change detection) + current name.
    const meta = await fetchItemMeta(accessToken, driveId, itemId, ctx.signal);
    const version = meta.cTag ?? meta.eTag ?? '';
    const name = meta.name ?? label;

    const prev = readState(ctx.secrets);

    // Reuse already-rendered slides when the content tag is unchanged (both
    // empty counts as unchanged — with no tag we can't detect a change, and
    // re-rendering every poll would just thrash).
    if (prev && prev.version === version) {
      ctx.logger.debug('powerpoint reuse', { itemId, version: prev.version });
      return fromState({ ...prev, name }, renderer);
    }

    // (Re)render the deck to slides on R2.
    const keyPrefix = buildKeyPrefix(ctx.connection.id, itemId, version);
    const { slideKeys } = await renderer.render({
      accessToken,
      driveId,
      itemId,
      keyPrefix,
      ...(ctx.signal ? { signal: ctx.signal } : {}),
    });

    const slides = toUrls(slideKeys, renderer);
    if (slides.length === 0) {
      throw new Error('powerpoint: render produced no slides');
    }

    // Best-effort cleanup of the previous version's now-unused objects.
    if (prev?.slideKeys.length) {
      const stale = prev.slideKeys.filter((k) => !slideKeys.includes(k));
      if (stale.length) {
        await renderer.deleteSlides(stale).catch(() => undefined);
      }
    }

    ctx.logger.debug('powerpoint rendered', {
      itemId,
      slides: slides.length,
    });
    const state: RenderedState = { version, slideKeys, name };
    return {
      playerPayload: { name, slides, ...(version ? { version } : {}) },
      ...(version ? { version } : {}),
      // A payload result with `secrets` omitted CLEARS them — always persist.
      secrets: { rendered: state },
    };
  },
};

/** Build the player payload from persisted state (reuse path). */
function fromState(
  state: RenderedState,
  renderer: PptxRenderer,
): ConnectorResult<PowerPointPayload> {
  const slides = toUrls(state.slideKeys, renderer);
  return {
    playerPayload: {
      name: state.name,
      slides,
      ...(state.version ? { version: state.version } : {}),
    },
    ...(state.version ? { version: state.version } : {}),
    // Re-persist so the payload upsert doesn't null out our render state.
    secrets: { rendered: state },
  };
}

function toUrls(keys: string[], renderer: PptxRenderer): string[] {
  return keys
    .map((key) => renderer.publicUrl(key))
    .filter((url): url is string => Boolean(url));
}

/** Deterministic, url-safe R2 key prefix scoped to the connection + version. */
function buildKeyPrefix(
  connectionId: string,
  itemId: string,
  version: string,
): string {
  const item = createHash('sha1')
    .update(`${connectionId}:${itemId}`)
    .digest('hex')
    .slice(0, 16);
  const ver = createHash('sha1')
    .update(version || 'v0')
    .digest('hex')
    .slice(0, 12);
  return `powerpoint/${item}/${ver}`;
}

function readState(
  secrets: Record<string, unknown> | undefined,
): RenderedState | undefined {
  const state = secrets?.rendered as Partial<RenderedState> | undefined;
  if (
    state &&
    typeof state.version === 'string' &&
    Array.isArray(state.slideKeys) &&
    typeof state.name === 'string'
  ) {
    return {
      version: state.version,
      slideKeys: state.slideKeys.filter(
        (key): key is string => typeof key === 'string',
      ),
      name: state.name,
    };
  }
  return undefined;
}

async function fetchItemMeta(
  accessToken: string,
  driveId: string,
  itemId: string,
  signal?: AbortSignal,
): Promise<{ name?: string; cTag?: string; eTag?: string }> {
  const url = `${GRAPH_DRIVES_URL}/${encodeURIComponent(
    driveId,
  )}/items/${encodeURIComponent(itemId)}?select=name,cTag,eTag`;
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` },
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) {
    throw new Error(`powerpoint: graph item ${response.status}`);
  }
  return (await response.json()) as {
    name?: string;
    cTag?: string;
    eTag?: string;
  };
}

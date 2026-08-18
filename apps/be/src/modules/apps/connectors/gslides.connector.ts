import { createHash } from 'node:crypto';

import type {
  AppConnector,
  ConnectorContext,
  ConnectorResult,
} from '@signagewall/apps-contract';
import type { GslidesPayload } from '@signagewall/apps';

import {
  type AssetMirror,
  getAssetMirror,
} from './_shared/asset-mirror.registry';
import { ensureDriveChannel } from './_shared/drive-watch';

const SLIDES_API = 'https://slides.googleapis.com/v1/presentations';
const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';

/** Hard cap on mirrored slides, so a huge deck can't exhaust storage/CPU. */
const MAX_SLIDES = 100;

/** How many slide thumbnails to export at once (Slides API is ~300 reads/min). */
const EXPORT_CONCURRENCY = 6;

interface GslidesConfig {
  connectionId?: string;
  /** The chosen deck: { id, label } from the `remote-select` picker. */
  presentation?: { id?: string; label?: string } | string;
  // `slideSeconds` / `maxSlides` are display-only (the bundle applies them).
  slideSeconds?: number;
  maxSlides?: number;
}

/** Persisted (server-only) state of the last mirror, carried via `secrets`. */
interface MirroredState {
  /** Drive revision of the deck when it was mirrored. */
  version: string;
  /** R2 object keys of the mirrored slides, in order. */
  slideKeys: string[];
  title: string;
}

function presentationIdOf(config: GslidesConfig): string {
  const value = config.presentation;
  const id = typeof value === 'string' ? value : (value?.id ?? '');
  return id.trim();
}

/**
 * Google Slides connector (`connected`). Per-connection cache key (a private
 * deck) plus the presentation id.
 *
 * On change it exports every slide via the Slides API thumbnail endpoint and
 * MIRRORS those images to R2, returning permanent public URLs. That mirroring is
 * the point: Google's `contentUrl`s expire in ~30 minutes, so pointing screens at
 * them directly meant the payload had to be re-pushed forever just to stay valid,
 * an offline screen could never play the deck, and a single missed refresh left a
 * wall of broken images. Re-hosted slides are ordinary cacheable images.
 *
 * Change-detection keys on the Drive file's revision (`version`, falling back to
 * `modifiedTime`), so an unchanged deck costs ONE cheap metadata call per poll
 * instead of one thumbnail export per slide. Updates are pushed live by the Drive
 * `files.watch` channel this connector registers itself; polling
 * (`refreshSeconds`) is the fallback that always still runs.
 *
 * Mirroring runs inside the fetch, so the connector raises the default fetch
 * budget. It only happens on an actual content change, so occupying one scheduler
 * slot for the duration is fine.
 */
export const gslidesConnector: AppConnector<GslidesConfig, GslidesPayload> = {
  oauth: {
    provider: 'google',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: [
      'https://www.googleapis.com/auth/presentations.readonly',
      'https://www.googleapis.com/auth/drive.file',
    ],
  },

  // Where Google posts `files.watch` notifications for the chosen deck.
  webhookPath: 'webhooks/google/drive',

  timeoutMs: 120_000,

  cacheKey(config) {
    const connectionId = config.connectionId ?? 'none';
    return `gslides:${connectionId}:${presentationIdOf(config) || 'none'}`;
  },

  async fetchData(
    config: GslidesConfig,
    ctx: ConnectorContext,
  ): Promise<ConnectorResult<GslidesPayload>> {
    if (!ctx.connection) {
      throw new Error('gslides: no connection resolved');
    }
    const presentationId = presentationIdOf(config);
    if (!presentationId) {
      throw new Error('gslides: missing presentation');
    }

    const mirror = getAssetMirror();
    if (!mirror) {
      // Mirror service not registered yet (very early boot). Retry next tick.
      return { pending: true };
    }
    if (!mirror.isConfigured()) {
      throw new Error('gslides: slide storage (R2) is not configured');
    }

    const accessToken = ctx.connection.accessToken;
    const label =
      (typeof config.presentation === 'object'
        ? config.presentation?.label
        : '') || 'Presentation';

    // Cheap metadata read: Drive revision (change detection) + current name.
    const meta = await fetchDriveMeta(presentationId, accessToken, ctx.signal);
    const version = meta.version ?? meta.modifiedTime ?? '';
    const title = meta.name || label;

    // Renew the push channel on every fetch — Drive channels expire in hours, so
    // the poll is what keeps the push alive. Never throws (see drive-watch.ts);
    // no public callback URL just means the poll cadence carries the data.
    const channel = await ensureDriveChannel(presentationId, ctx);
    const persist = (state: MirroredState): Record<string, unknown> => ({
      mirrored: state,
      ...(channel ? { channel } : {}),
    });

    const prev = readState(ctx.secrets);

    // Reuse already-mirrored slides when the revision is unchanged. A blank
    // version means Drive told us nothing useful; re-mirroring every poll on
    // that basis would thrash R2, so treat blank-vs-blank as unchanged too.
    if (prev && prev.version === version) {
      ctx.logger.debug('gslides reuse', { presentationId, version });
      return finalize({ ...prev, title }, mirror, persist);
    }

    const pageIds = await fetchPageIds(presentationId, accessToken, ctx.signal);
    const truncated = pageIds.length > MAX_SLIDES;
    if (truncated) {
      ctx.logger.warn('gslides deck truncated', {
        presentationId,
        slides: pageIds.length,
        cap: MAX_SLIDES,
      });
    }
    const kept = pageIds.slice(0, MAX_SLIDES);

    // Every page or none. A page that 429s must fail the whole fetch, because a
    // partial export would be MIRRORED AND CACHED under this revision and then
    // replayed until the operator next edits the deck — a permanently missing
    // slide 7 from one transient error. Failing here keeps the last good
    // revision on screen and retries on the next tick.
    //
    // Bounded, for the same reason: firing 100 thumbnail exports at once is the
    // surest way to earn the 429 that would now cost us the whole render.
    const exported = await mapBounded(kept, EXPORT_CONCURRENCY, (pageId) =>
      slideThumbnail(presentationId, pageId, accessToken, ctx.signal),
    );

    const slideKeys = await mirror.mirrorImages({
      urls: exported,
      keyPrefix: buildKeyPrefix(ctx.connection.id, presentationId, version),
      ...(ctx.signal ? { signal: ctx.signal } : {}),
    });

    // Best-effort cleanup of the previous revision's now-unused objects.
    if (prev?.slideKeys.length) {
      const stale = prev.slideKeys.filter((key) => !slideKeys.includes(key));
      if (stale.length) {
        await mirror.deleteObjects(stale).catch(() => undefined);
      }
    }

    ctx.logger.debug('gslides mirrored', {
      presentationId,
      slides: slideKeys.length,
    });
    return finalize({ version, slideKeys, title }, mirror, persist);
  },
};

/**
 * Build the result from mirror state. `version` is the Drive revision, and it is
 * a STABLE signature now that slide URLs are permanent — the host uses it to skip
 * the fan-out when the deck hasn't changed.
 */
function finalize(
  state: MirroredState,
  mirror: AssetMirror,
  persist: (state: MirroredState) => Record<string, unknown>,
): ConnectorResult<GslidesPayload> {
  const slides = state.slideKeys
    .map((key) => mirror.publicUrl(key))
    .filter((url): url is string => Boolean(url));
  if (slides.length === 0) {
    throw new Error('gslides: no mirrored slides available');
  }
  return {
    playerPayload: {
      title: state.title,
      slides,
      ...(state.version ? { version: state.version } : {}),
    },
    ...(state.version ? { version: state.version } : {}),
    // A payload result with `secrets` omitted CLEARS them — always persist.
    secrets: persist(state),
  };
}

/** Deterministic, url-safe R2 key prefix scoped to the connection + revision. */
function buildKeyPrefix(
  connectionId: string,
  presentationId: string,
  version: string,
): string {
  const deck = createHash('sha1')
    .update(`${connectionId}:${presentationId}`)
    .digest('hex')
    .slice(0, 16);
  const ver = createHash('sha1')
    .update(version || 'v0')
    .digest('hex')
    .slice(0, 12);
  return `gslides/${deck}/${ver}`;
}

function readState(
  secrets: Record<string, unknown> | undefined,
): MirroredState | undefined {
  const state = secrets?.mirrored as Partial<MirroredState> | undefined;
  if (
    !state ||
    typeof state.version !== 'string' ||
    !Array.isArray(state.slideKeys) ||
    typeof state.title !== 'string'
  ) {
    return undefined;
  }
  const slideKeys = state.slideKeys.filter(
    (key): key is string => typeof key === 'string',
  );
  if (slideKeys.length === 0) {
    return undefined;
  }
  return {
    version: state.version,
    slideKeys,
    title: state.title,
  };
}

/**
 * `items.map(fn)` with at most `lanes` in flight, preserving input order. The
 * first rejection propagates, as `Promise.all` would.
 */
async function mapBounded<T, R>(
  items: T[],
  lanes: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    for (;;) {
      const index = next++;
      if (index >= items.length) return;
      out[index] = await fn(items[index]);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(lanes, items.length) }, () => worker()),
  );
  return out;
}

/** Drive metadata for change detection. `version` bumps on every content edit. */
async function fetchDriveMeta(
  presentationId: string,
  accessToken: string,
  signal: AbortSignal | undefined,
): Promise<{ name?: string; version?: string; modifiedTime?: string }> {
  const response = await fetch(
    `${DRIVE_API}/${encodeURIComponent(presentationId)}?fields=name,version,modifiedTime`,
    {
      headers: { authorization: `Bearer ${accessToken}` },
      ...(signal ? { signal } : {}),
    },
  );
  if (!response.ok) {
    throw new Error(`gslides: drive meta ${String(response.status)}`);
  }
  return (await response.json()) as {
    name?: string;
    version?: string;
    modifiedTime?: string;
  };
}

/** The deck's page ids, in order — not the whole (large) presentation body. */
async function fetchPageIds(
  presentationId: string,
  accessToken: string,
  signal: AbortSignal | undefined,
): Promise<string[]> {
  const response = await fetch(
    `${SLIDES_API}/${encodeURIComponent(presentationId)}?fields=slides.objectId`,
    {
      headers: { authorization: `Bearer ${accessToken}` },
      ...(signal ? { signal } : {}),
    },
  );
  if (!response.ok) {
    throw new Error(`gslides upstream ${String(response.status)}`);
  }
  const body = (await response.json()) as {
    slides?: Array<{ objectId?: string }>;
  };
  const pageIds = (body.slides ?? [])
    .map((slide) => slide.objectId)
    .filter((id): id is string => typeof id === 'string');
  if (pageIds.length === 0) {
    throw new Error('gslides: presentation has no slides');
  }
  return pageIds;
}

/** Export one slide's thumbnail URL. Throws — see the call site for why. */
async function slideThumbnail(
  presentationId: string,
  pageId: string,
  accessToken: string,
  signal: AbortSignal | undefined,
): Promise<string> {
  const url =
    `${SLIDES_API}/${encodeURIComponent(presentationId)}/pages/${encodeURIComponent(pageId)}/thumbnail` +
    `?thumbnailProperties.thumbnailSize=LARGE`;
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` },
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) {
    throw new Error(`gslides: thumbnail ${String(response.status)}`);
  }
  const body = (await response.json()) as { contentUrl?: string };
  if (typeof body.contentUrl !== 'string' || !body.contentUrl) {
    throw new Error('gslides: thumbnail without contentUrl');
  }
  return body.contentUrl;
}

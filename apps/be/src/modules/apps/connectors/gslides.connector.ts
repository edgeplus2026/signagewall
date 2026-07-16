import type {
  AppConnector,
  ConnectorContext,
  ConnectorResult,
} from '@edge/apps-contract';
import type { GslidesPayload } from '@edge/apps';

interface GslidesConfig {
  connectionId?: string;
  /** The chosen deck: { id, label } from the `remote-select` picker. */
  presentation?: { id?: string; label?: string } | string;
  // `slideSeconds` / `maxSlides` are display-only (the bundle applies them).
  slideSeconds?: number;
  maxSlides?: number;
}

const SLIDES_API = 'https://slides.googleapis.com/v1/presentations';

/** Cap exported slides — one thumbnail call per slide, and a wall shows a loop. */
const MAX_SLIDES = 30;

function presentationIdOf(config: GslidesConfig): string {
  const value = config.presentation;
  const id = typeof value === 'string' ? value : (value?.id ?? '');
  return id.trim();
}

/** Export one slide's thumbnail URL, or null if that page can't be exported. */
async function slideThumbnail(
  presentationId: string,
  pageId: string,
  accessToken: string,
  signal: AbortSignal | undefined,
): Promise<string | null> {
  const url =
    `${SLIDES_API}/${encodeURIComponent(presentationId)}/pages/${encodeURIComponent(pageId)}/thumbnail` +
    `?thumbnailProperties.thumbnailSize=LARGE`;
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` },
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) {
    return null;
  }
  const body = (await response.json()) as { contentUrl?: string };
  return typeof body.contentUrl === 'string' ? body.contentUrl : null;
}

/**
 * Google Slides connector (`connected`). Per-connection cache key (a private deck)
 * plus the presentation id. Reads the deck's page ids, then exports each page as
 * a thumbnail image via the Slides API. Those URLs are TEMPORARY, so the payload
 * carries NO `version`: the rotating URLs make the payload differ every refresh,
 * which re-pushes fresh URLs to the screen before the old ones expire (~30 min).
 * The 15-minute cadence keeps a comfortable margin. `maxSlides`/`slideSeconds`
 * are display-only and applied by the bundle.
 */
export const gslidesConnector: AppConnector<GslidesConfig, GslidesPayload> = {
  oauth: {
    provider: 'google',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: [
      'https://www.googleapis.com/auth/presentations.readonly',
      'https://www.googleapis.com/auth/drive.metadata.readonly',
    ],
  },

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
    const accessToken = ctx.connection.accessToken;

    // Only the title + page ids — not the whole (large) presentation body.
    const metaResponse = await fetch(
      `${SLIDES_API}/${encodeURIComponent(presentationId)}?fields=title,slides.objectId`,
      {
        headers: { authorization: `Bearer ${accessToken}` },
        ...(ctx.signal ? { signal: ctx.signal } : {}),
      },
    );
    if (!metaResponse.ok) {
      throw new Error(`gslides upstream ${metaResponse.status}`);
    }
    const meta = (await metaResponse.json()) as {
      title?: string;
      slides?: Array<{ objectId?: string }>;
    };

    const pageIds = (meta.slides ?? [])
      .map((slide) => slide.objectId)
      .filter((id): id is string => typeof id === 'string')
      .slice(0, MAX_SLIDES);
    if (pageIds.length === 0) {
      throw new Error('gslides: presentation has no slides');
    }

    const thumbs = await Promise.all(
      pageIds.map((pageId) =>
        slideThumbnail(presentationId, pageId, accessToken, ctx.signal),
      ),
    );
    const slides = thumbs.filter((url): url is string => url !== null);
    if (slides.length === 0) {
      throw new Error('gslides: no slide images exported');
    }

    const label =
      typeof config.presentation === 'object' ? config.presentation?.label : '';
    ctx.logger.debug('gslides fetched', {
      presentationId,
      slides: slides.length,
    });
    return {
      playerPayload: { title: meta.title || label || 'Presentation', slides },
    };
  },
};

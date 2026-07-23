import type {
  AppConnector,
  ConnectorContext,
  ConnectorResult,
} from '@edge/apps-contract';
import type { SocialPayload, SocialPost } from '@edge/apps';

interface InstagramConfig {
  connectionId?: string;
  /** The chosen IG account: { id, label } from the `remote-select` picker. */
  account?: { id?: string } | string;
  /** How many recent posts to fetch (display-only cap applied client-side too). */
  postCount?: number;
}

const GRAPH_VERSION = 'v22.0';
const GRAPH_API = `https://graph.facebook.com/${GRAPH_VERSION}`;

/** Cap on posts stored per fetch (the media endpoint returns newest-first). */
const MAX_STORED_POSTS = 24;

/** Resolve the chosen IG user-id from config ({ id } or legacy string). */
function accountIdOf(config: InstagramConfig): string {
  const value = config.account;
  return (typeof value === 'string' ? value : (value?.id ?? '')).trim();
}

interface IgMedia {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
  username?: string;
}

/** Map Instagram's media_type to the shared payload's coarse mediaType. */
function mediaTypeOf(type: string | undefined): SocialPost['mediaType'] {
  return type === 'VIDEO' ? 'video' : 'image';
}

function toPost(media: IgMedia): SocialPost {
  // VIDEO items expose a still in `thumbnail_url`; IMAGE/CAROUSEL use media_url.
  const imageUrl =
    media.media_type === 'VIDEO'
      ? (media.thumbnail_url ?? media.media_url)
      : media.media_url;
  return {
    id: media.id,
    ...(media.caption ? { text: media.caption } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(media.permalink ? { permalink: media.permalink } : {}),
    ...(media.timestamp ? { timestamp: media.timestamp } : {}),
    mediaType: mediaTypeOf(media.media_type),
  };
}

/**
 * Instagram connector (`connected` app, Meta provider). Reads the recent media
 * of a professional (Business/Creator) IG account linked to a Facebook Page. The
 * cache key is PER-CONNECTION + account (a feed is private to the account), so
 * data is never shared across connections. Display-only settings (post count,
 * layout, theme) are applied by the embed and never affect the key.
 *
 * Returns NO `version`: media_url is a rotating CDN link, so the payload
 * legitimately changes across fetches and must fan out to keep images live (see
 * the note on `SocialPayload`). `refreshSeconds` is kept modest to bound that.
 */
export const instagramConnector: AppConnector<InstagramConfig, SocialPayload> =
  {
    oauth: {
      provider: 'meta',
      authorizationUrl: `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`,
      tokenUrl: `${GRAPH_API}/oauth/access_token`,
      // Read a linked IG business account's media. `pages_show_list` lets us
      // enumerate the Pages the IG accounts hang off in the picker.
      scopes: ['instagram_basic', 'pages_show_list'],
    },

    cacheKey(config) {
      const connectionId = config.connectionId ?? 'none';
      return `instagram:${connectionId}:${accountIdOf(config) || 'none'}`;
    },

    async fetchData(
      config: InstagramConfig,
      ctx: ConnectorContext,
    ): Promise<ConnectorResult<SocialPayload>> {
      if (!ctx.connection) {
        throw new Error('instagram: no connection resolved');
      }
      const accountId = accountIdOf(config);
      if (!accountId) {
        throw new Error('instagram: no account selected');
      }

      const fields =
        'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,username';
      const query = new URLSearchParams({
        fields,
        limit: String(MAX_STORED_POSTS),
      });
      const url = `${GRAPH_API}/${encodeURIComponent(accountId)}/media?${query.toString()}`;

      const response = await fetch(url, {
        headers: { authorization: `Bearer ${ctx.connection.accessToken}` },
        ...(ctx.signal ? { signal: ctx.signal } : {}),
      });
      if (!response.ok) {
        throw new Error(`instagram upstream ${response.status}`);
      }
      const body = (await response.json()) as {
        data?: IgMedia[];
      };

      const items = body.data ?? [];
      const posts = items.slice(0, MAX_STORED_POSTS).map(toPost);
      // The account @handle rides on each media row (`username`); read the first.
      const username = items[0]?.username;
      const accountLabel = username ? `@${username}` : 'Instagram';

      ctx.logger.debug('instagram fetched', { accountId, posts: posts.length });
      return { playerPayload: { accountLabel, posts } };
    },
  };

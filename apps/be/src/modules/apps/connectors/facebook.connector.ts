import type {
  AppConnector,
  ConnectorContext,
  ConnectorResult,
} from '@edge/apps-contract';
import type { SocialPayload, SocialPost } from '@edge/apps';

import { getPageAccessToken } from '../../connections/providers/meta-api';

interface FacebookConfig {
  connectionId?: string;
  /** The chosen Page: { id, label } from the `remote-select` picker. */
  page?: { id?: string; label?: string } | string;
}

const GRAPH_VERSION = 'v22.0';
const GRAPH_API = `https://graph.facebook.com/${GRAPH_VERSION}`;

/** Cap on posts stored per fetch (the feed returns newest-first). */
const MAX_STORED_POSTS = 24;

/** Resolve the chosen Page id from config ({ id } or legacy string). */
function pageIdOf(config: FacebookConfig): string {
  const value = config.page;
  return (typeof value === 'string' ? value : (value?.id ?? '')).trim();
}

interface FbPost {
  id: string;
  message?: string;
  story?: string;
  created_time?: string;
  full_picture?: string;
  permalink_url?: string;
}

function toPost(post: FbPost): SocialPost {
  const text = post.message ?? post.story;
  return {
    id: post.id,
    ...(text ? { text } : {}),
    ...(post.full_picture ? { imageUrl: post.full_picture } : {}),
    ...(post.permalink_url ? { permalink: post.permalink_url } : {}),
    ...(post.created_time ? { timestamp: post.created_time } : {}),
    mediaType: post.full_picture ? 'image' : 'text',
  };
}

/**
 * Facebook Page connector (`connected` app, Meta provider). Reads a Page's
 * recent published posts. Reading a Page's own feed needs a PAGE access token
 * (not the user token), so each fetch first resolves the Page token from the
 * connection's long-lived user token, then reads the feed. The cache key is
 * PER-CONNECTION + page, so data is never shared across connections.
 *
 * Returns NO `version`: `full_picture` is a rotating CDN link, so the payload
 * legitimately changes across fetches and must fan out to keep images live (see
 * the note on `SocialPayload`).
 */
export const facebookConnector: AppConnector<FacebookConfig, SocialPayload> = {
  oauth: {
    provider: 'meta',
    authorizationUrl: `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`,
    tokenUrl: `${GRAPH_API}/oauth/access_token`,
    // Enumerate the user's Pages and read a Page's engagement (its feed).
    scopes: ['pages_show_list', 'pages_read_engagement'],
  },

  cacheKey(config) {
    const connectionId = config.connectionId ?? 'none';
    return `facebook:${connectionId}:${pageIdOf(config) || 'none'}`;
  },

  async fetchData(
    config: FacebookConfig,
    ctx: ConnectorContext,
  ): Promise<ConnectorResult<SocialPayload>> {
    if (!ctx.connection) {
      throw new Error('facebook: no connection resolved');
    }
    const pageId = pageIdOf(config);
    if (!pageId) {
      throw new Error('facebook: no page selected');
    }

    // A Page's feed is only readable with the Page access token, derived from
    // the connection's (long-lived) user token.
    const pageToken = await getPageAccessToken(
      ctx.connection.accessToken,
      pageId,
      ctx.signal,
    );

    const query = new URLSearchParams({
      fields: 'id,message,story,created_time,full_picture,permalink_url',
      limit: String(MAX_STORED_POSTS),
    });
    const url = `${GRAPH_API}/${encodeURIComponent(pageId)}/posts?${query.toString()}`;

    const response = await fetch(url, {
      headers: { authorization: `Bearer ${pageToken}` },
      ...(ctx.signal ? { signal: ctx.signal } : {}),
    });
    if (!response.ok) {
      throw new Error(`facebook upstream ${response.status}`);
    }
    const body = (await response.json()) as { data?: FbPost[] };

    const posts = (body.data ?? []).slice(0, MAX_STORED_POSTS).map(toPost);
    // Prefer the picked page's label; the id is a poor fallback.
    const value = config.page;
    const accountLabel =
      (typeof value === 'object' ? value.label : undefined) ?? 'Facebook';

    ctx.logger.debug('facebook fetched', { pageId, posts: posts.length });
    return { playerPayload: { accountLabel, posts } };
  },
};

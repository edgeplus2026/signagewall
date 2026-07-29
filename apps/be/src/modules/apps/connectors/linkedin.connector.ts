import type {
  AppConnector,
  ConnectorContext,
  ConnectorResult,
} from '@signagewall/apps-contract';
import type { SocialPayload, SocialPost } from '@signagewall/apps';

import { linkedinHeaders } from '../../connections/providers/linkedin-api';

interface LinkedInConfig {
  connectionId?: string;
  /** The chosen Page: { id, label } from the `remote-select` picker. */
  organization?: { id?: string; label?: string } | string;
}

const REST_API = 'https://api.linkedin.com/rest';

/** Cap on posts stored per fetch (the finder returns newest-first). */
const MAX_STORED_POSTS = 20;

/**
 * Resolve the chosen Page to an organization URN. The picker stores the full URN,
 * but accept a bare numeric id too (a hand-written config, or a legacy value).
 */
function organizationUrnOf(config: LinkedInConfig): string {
  const value = config.organization;
  const raw = (typeof value === 'string' ? value : (value?.id ?? '')).trim();
  if (!raw) {
    return '';
  }
  return /^\d+$/.test(raw) ? `urn:li:organization:${raw}` : raw;
}

interface LiPost {
  id?: string;
  commentary?: string;
  lifecycleState?: string;
  publishedAt?: number;
  createdAt?: number;
  content?: {
    /** Image / video / document post: the asset URN plus an optional title. */
    media?: { id?: string; title?: string };
    article?: { title?: string; description?: string; source?: string };
  };
}

/**
 * Reduce LinkedIn's "little" text format to plain text. Commentary comes back
 * with hashtags as `{hashtag|\#|coding}` templates, mentions as
 * `@[Name](urn:li:organization:1)`, and reserved punctuation backslash-escaped.
 * The embed re-escapes before rendering, so this only has to make it readable.
 */
function littleToText(commentary: string): string {
  return (
    commentary
      .replace(/\{hashtag\|\\?#\|([^}]+)\}/g, '#$1')
      .replace(/@\[([^\]]*)\]\([^)]*\)/g, '$1')
      // Unescape last: the templates above rely on the literal `\#`.
      .replace(/\\([\\{}|()[\]@#])/g, '$1')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

/**
 * The text to show for a post. Commentary is the post as written; when a post has
 * none, an article's own title/description (or a video/document title) is the
 * only thing left that reads as content, so fold that in instead.
 */
function textOf(post: LiPost): string {
  const commentary = post.commentary ? littleToText(post.commentary) : '';
  if (commentary) {
    return commentary;
  }
  const article = post.content?.article;
  if (article) {
    return [article.title?.trim(), article.description?.trim()]
      .filter(Boolean)
      .join(' — ');
  }
  return post.content?.media?.title?.trim() ?? '';
}

function toPost(post: LiPost): SocialPost | null {
  // Only published posts; drafts/failed/processing are not for a screen.
  if (!post.id || post.lifecycleState !== 'PUBLISHED') {
    return null;
  }
  const text = textOf(post);
  // Image-only posts leave no text: their pictures are URNs the Images API only
  // resolves for a token with WRITE access to the Page, which SignageWall never asks
  // for — so there is nothing to render and we skip them.
  if (!text) {
    return null;
  }
  const published = post.publishedAt ?? post.createdAt;
  return {
    id: post.id,
    text,
    permalink: `https://www.linkedin.com/feed/update/${post.id}/`,
    ...(published ? { timestamp: new Date(published).toISOString() } : {}),
    mediaType: 'text',
  };
}

/**
 * LinkedIn Page connector (`connected` app, LinkedIn provider). Reads a Page's
 * recent published posts through the versioned Posts API author finder and
 * renders them via the shared social-feed embed. The cache key is PER-CONNECTION
 * + organization, so data is never shared across connections.
 *
 * TEXT-ONLY by design: post images are `urn:li:image:…` references and resolving
 * one costs a GET on the Images API, which LinkedIn permits only for tokens
 * holding a WRITE scope (`w_organization_social` / `rw_ads`). Asking an operator
 * for write access to their Page just to show a picture is the wrong trade, so
 * posts render as text heroes (the treatment Teams messages already get) and
 * image-only posts are dropped.
 *
 * That also makes the payload STABLE — no rotating CDN URLs like Instagram's or
 * Facebook's — so it does not fan out on every refresh and needs no `version`.
 *
 * Reading a Page's posts needs `r_organization_social`; listing the Pages needs
 * `rw_organization_admin`. Both come from LinkedIn's Community Management API
 * product, which is granted only by an access-request review.
 *
 * `rw_organization_admin` is READ/WRITE by name and that is not an oversight:
 * Community Management grants no read-only admin scope (the `r_organization_admin`
 * variant belongs to the Advertising API product), and without it there is no way
 * to ask "which Pages does this member administer". Nothing in this connector
 * ever writes — see the OPERATOR.md note, which the config-form help text mirrors
 * so operators are not surprised by the consent screen.
 */
export const linkedinConnector: AppConnector<LinkedInConfig, SocialPayload> = {
  oauth: {
    provider: 'linkedin',
    authorizationUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    // Exactly what the Community Management API product grants for this job:
    // enumerate the member's administered Pages, and read their posts.
    // `r_basicprofile` (the account label) is added by the provider.
    scopes: ['rw_organization_admin', 'r_organization_social'],
  },

  cacheKey(config) {
    const connectionId = config.connectionId ?? 'none';
    return `linkedin:${connectionId}:${organizationUrnOf(config) || 'none'}`;
  },

  async fetchData(
    config: LinkedInConfig,
    ctx: ConnectorContext,
  ): Promise<ConnectorResult<SocialPayload>> {
    if (!ctx.connection) {
      throw new Error('linkedin: no connection resolved');
    }
    const organizationUrn = organizationUrnOf(config);
    if (!organizationUrn) {
      throw new Error('linkedin: no page selected');
    }

    const query = new URLSearchParams({
      author: organizationUrn,
      q: 'author',
      count: String(MAX_STORED_POSTS),
      sortBy: 'LAST_MODIFIED',
    });
    const response = await fetch(`${REST_API}/posts?${query.toString()}`, {
      headers: {
        ...linkedinHeaders(ctx.connection.accessToken),
        // The author query is a Rest.li FINDER; LinkedIn's docs send this on it.
        'X-RestLi-Method': 'FINDER',
      },
      ...(ctx.signal ? { signal: ctx.signal } : {}),
    });
    if (!response.ok) {
      throw new Error(`linkedin upstream ${response.status}`);
    }
    const body = (await response.json()) as { elements?: LiPost[] };

    const posts = (body.elements ?? [])
      .map(toPost)
      .filter((post): post is SocialPost => post !== null)
      .slice(0, MAX_STORED_POSTS);
    // Prefer the picked Page's label; the URN is a poor fallback.
    const value = config.organization;
    const accountLabel =
      (typeof value === 'object' ? value.label : undefined) ?? 'LinkedIn';

    ctx.logger.debug('linkedin fetched', {
      organizationUrn,
      posts: posts.length,
    });
    return { playerPayload: { accountLabel, posts } };
  },
};

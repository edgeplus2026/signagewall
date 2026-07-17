import type {
  AppConnector,
  ConnectorContext,
  ConnectorResult,
} from '@edge/apps-contract';
import type { SocialPayload, SocialPost } from '@edge/apps';

interface TeamsConfig {
  connectionId?: string;
  /**
   * The chosen channel from the `remote-select` picker. Its id is the composite
   * `<teamId>::<channelId>` produced by `listTeamsChannels` (a channel is only
   * addressable together with its team).
   */
  channel?: { id?: string; label?: string } | string;
}

const GRAPH_API = 'https://graph.microsoft.com/v1.0';

/** Cap on messages stored per fetch (Graph's $top max here is 50). */
const MAX_STORED = 20;

/** Split the composite picker id into its team and channel parts. */
function parseChannel(config: TeamsConfig): {
  teamId: string;
  channelId: string;
} {
  const value = config.channel;
  const id = (typeof value === 'string' ? value : (value?.id ?? '')).trim();
  const sep = id.indexOf('::');
  if (sep < 0) {
    return { teamId: '', channelId: '' };
  }
  return { teamId: id.slice(0, sep), channelId: id.slice(sep + 2) };
}

/** The picked channel's display label ("Team · Channel"), when present. */
function channelLabelOf(config: TeamsConfig): string | undefined {
  const value = config.channel;
  return typeof value === 'object' ? value.label : undefined;
}

interface TeamsMessage {
  id: string;
  messageType?: string;
  deletedDateTime?: string | null;
  createdDateTime?: string;
  subject?: string | null;
  webUrl?: string;
  body?: { content?: string; contentType?: string };
  from?: { user?: { displayName?: string | null } | null } | null;
}

/**
 * Reduce Teams' HTML message body to plain text. Message bodies are small,
 * operator-org content (not arbitrary web input), so a tag strip with a few
 * entity decodes is enough; the embed re-escapes before rendering.
 */
function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function toPost(message: TeamsMessage): SocialPost | null {
  // Skip system events (joins, renames) and tombstones — only real messages.
  if (message.messageType !== 'message' || message.deletedDateTime) {
    return null;
  }
  const raw = message.body?.content ?? '';
  const bodyText =
    message.body?.contentType === 'text' ? raw.trim() : htmlToText(raw);
  const subject = message.subject?.trim();
  // Announcements carry a subject (headline); fold it in front of the body.
  const text = [subject, bodyText].filter(Boolean).join(' — ');
  // Image-only messages leave no text: their pictures are hosted-content URLs
  // that need a bearer token, so they can't be shown on a screen — skip them.
  if (!text) {
    return null;
  }
  const author = message.from?.user?.displayName ?? undefined;
  return {
    id: message.id,
    ...(author ? { author } : {}),
    text,
    ...(message.webUrl ? { permalink: message.webUrl } : {}),
    ...(message.createdDateTime ? { timestamp: message.createdDateTime } : {}),
    mediaType: 'text',
  };
}

/**
 * Microsoft Teams connector (`connected` app, Microsoft provider). Reads the
 * recent messages of one channel and renders them through the shared social-feed
 * embed (a channel is a feed of authored posts). The cache key is PER-CONNECTION
 * + team + channel, so data is never shared across connections.
 *
 * Unlike Instagram/Facebook this payload has NO rotating image URLs (Teams
 * hosted images need a bearer token and are skipped), so it is stable and does
 * NOT fan out — no `version` needed.
 *
 * Reading channel messages needs the `ChannelMessage.Read.All` delegated scope,
 * which requires Azure AD admin consent; the picker also needs `Team.ReadBasic.All`
 * and `Channel.ReadBasic.All`. Personal Microsoft accounts are not supported.
 */
export const teamsConnector: AppConnector<TeamsConfig, SocialPayload> = {
  oauth: {
    provider: 'microsoft',
    authorizationUrl:
      'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scopes: [
      'https://graph.microsoft.com/Team.ReadBasic.All',
      'https://graph.microsoft.com/Channel.ReadBasic.All',
      'https://graph.microsoft.com/ChannelMessage.Read.All',
    ],
  },

  cacheKey(config) {
    const connectionId = config.connectionId ?? 'none';
    const { teamId, channelId } = parseChannel(config);
    return `teams:${connectionId}:${teamId || 'none'}:${channelId || 'none'}`;
  },

  async fetchData(
    config: TeamsConfig,
    ctx: ConnectorContext,
  ): Promise<ConnectorResult<SocialPayload>> {
    if (!ctx.connection) {
      throw new Error('teams: no connection resolved');
    }
    const { teamId, channelId } = parseChannel(config);
    if (!teamId || !channelId) {
      throw new Error('teams: no channel selected');
    }

    const url =
      `${GRAPH_API}/teams/${encodeURIComponent(teamId)}` +
      `/channels/${encodeURIComponent(channelId)}/messages?$top=${MAX_STORED}`;

    const response = await fetch(url, {
      headers: { authorization: `Bearer ${ctx.connection.accessToken}` },
      ...(ctx.signal ? { signal: ctx.signal } : {}),
    });
    if (!response.ok) {
      throw new Error(`teams upstream ${response.status}`);
    }
    const body = (await response.json()) as { value?: TeamsMessage[] };

    const posts = (body.value ?? [])
      .map(toPost)
      .filter((post): post is SocialPost => post !== null);
    const accountLabel = channelLabelOf(config) ?? 'Teams';

    ctx.logger.debug('teams fetched', { teamId, channelId, posts: posts.length });
    return { playerPayload: { accountLabel, posts } };
  },
};

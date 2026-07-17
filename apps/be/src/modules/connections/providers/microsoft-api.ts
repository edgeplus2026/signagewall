/**
 * Thin client for Microsoft Graph, used by the connections browse endpoint (list
 * the account's calendars for the config-form picker). Pure functions over
 * `fetch`; the caller supplies an already-resolved (refreshed) access token.
 */

const GRAPH_API = 'https://graph.microsoft.com/v1.0';

/** A calendar as surfaced to the CMS picker (token-free). */
export interface MicrosoftCalendarSummary {
  id: string;
  title: string;
  /** The default calendar sorts first and reads as "Primary". */
  primary?: boolean;
}

interface GraphCalendar {
  id: string;
  name?: string;
  isDefaultCalendar?: boolean;
}

/**
 * List the calendars the connected account can read. Graph has no free-text
 * search here, so `query` filters by title client-side. The default calendar
 * sorts first; the rest alphabetically. Mirrors the Google calendar picker.
 */
export async function listMicrosoftCalendars(
  accessToken: string,
  query: string,
  signal?: AbortSignal,
): Promise<MicrosoftCalendarSummary[]> {
  const response = await fetch(
    `${GRAPH_API}/me/calendars?$select=id,name,isDefaultCalendar&$top=100`,
    {
      headers: { authorization: `Bearer ${accessToken}` },
      ...(signal ? { signal } : {}),
    },
  );
  if (!response.ok) {
    throw new Error(`microsoft graph upstream ${response.status}`);
  }
  const body = (await response.json()) as { value?: GraphCalendar[] };

  const calendars: MicrosoftCalendarSummary[] = (body.value ?? []).map(
    (calendar) => ({
      id: calendar.id,
      title: calendar.name ?? calendar.id,
      ...(calendar.isDefaultCalendar ? { primary: true } : {}),
    }),
  );

  const trimmed = query.trim().toLowerCase();
  const filtered = trimmed
    ? calendars.filter((cal) => cal.title.toLowerCase().includes(trimmed))
    : calendars;

  return filtered.sort((a, b) => {
    if (a.primary !== b.primary) return a.primary ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
}

/** A "Team · Channel" pair surfaced to the CMS picker (token-free). */
export interface MicrosoftChannelSummary {
  /** Composite `<teamId>::<channelId>` — the connector splits it apart. */
  id: string;
  title: string;
}

interface JoinedTeam {
  id: string;
  displayName?: string;
}

interface GraphChannel {
  id: string;
  displayName?: string;
}

/** Cap the teams we expand so the picker can't fan out into hundreds of calls. */
const MAX_TEAMS = 20;

/**
 * List the channels the connected account can read, as flat "Team · Channel"
 * options. Teams has no single "all my channels" endpoint, so we read the user's
 * joined teams (`Team.ReadBasic.All`) and then each team's channels
 * (`Channel.ReadBasic.All`) in parallel, and flatten. The option id is a
 * composite `<teamId>::<channelId>` (a channel is only addressable together with
 * its team). A team whose channels can't be read is skipped rather than failing
 * the whole picker.
 */
export async function listTeamsChannels(
  accessToken: string,
  query: string,
  signal?: AbortSignal,
): Promise<MicrosoftChannelSummary[]> {
  const headers = { authorization: `Bearer ${accessToken}` };

  const teamsResponse = await fetch(
    `${GRAPH_API}/me/joinedTeams?$select=id,displayName`,
    { headers, ...(signal ? { signal } : {}) },
  );
  if (!teamsResponse.ok) {
    throw new Error(`microsoft graph upstream ${teamsResponse.status}`);
  }
  const teamsBody = (await teamsResponse.json()) as { value?: JoinedTeam[] };
  const teams = (teamsBody.value ?? []).slice(0, MAX_TEAMS);

  const perTeam = await Promise.all(
    teams.map(async (team) => {
      const response = await fetch(
        `${GRAPH_API}/teams/${encodeURIComponent(team.id)}/channels?$select=id,displayName`,
        { headers, ...(signal ? { signal } : {}) },
      );
      if (!response.ok) {
        return [] as MicrosoftChannelSummary[];
      }
      const body = (await response.json()) as { value?: GraphChannel[] };
      const teamName = team.displayName ?? 'Team';
      return (body.value ?? []).map((channel) => ({
        id: `${team.id}::${channel.id}`,
        title: `${teamName} · ${channel.displayName ?? 'Channel'}`,
      }));
    }),
  );

  const channels = perTeam.flat();
  const trimmed = query.trim().toLowerCase();
  const filtered = trimmed
    ? channels.filter((c) => c.title.toLowerCase().includes(trimmed))
    : channels;
  return filtered.sort((a, b) => a.title.localeCompare(b.title));
}

import type {
  AppConnector,
  ConnectorContext,
  ConnectorResult,
} from '@edge/apps-contract';
import type { SportsEvent, SportsPayload } from '@edge/apps';

interface SportsConfig {
  team?: string;
  // `mode` / `count` are display-only (the bundle applies them); not in the key.
  mode?: string;
  count?: number;
}

const API = 'https://www.thesportsdb.com/api/v1/json';

/** How many fixtures/results to keep per section (the bundle shows `count`). */
const MAX_STORED = 10;

/**
 * TheSportsDB API key. Reads `THESPORTSDB_API_KEY` from the backend env (E5) but
 * defaults to the free public test key `3`, so the app works with no setup and
 * an operator can raise the limits later by setting their own key.
 */
function apiKey(): string {
  return process.env.THESPORTSDB_API_KEY?.trim() || '3';
}

function teamOf(config: SportsConfig): string {
  return (config.team ?? '').trim();
}

async function fetchJson(
  url: string,
  signal: AbortSignal | undefined,
): Promise<unknown> {
  const response = await fetch(url, signal ? { signal } : {});
  if (!response.ok) {
    throw new Error(`sports upstream ${response.status}`);
  }
  return response.json();
}

interface RawEvent {
  strHomeTeam?: string;
  strAwayTeam?: string;
  dateEvent?: string;
  strTime?: string;
  strLeague?: string;
  intHomeScore?: string | null;
  intAwayScore?: string | null;
}

/** A whole-number score, or undefined when upstream has none yet. */
function score(value: string | null | undefined): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** Map TheSportsDB events to the neutral payload shape; drop undated rows. */
function mapEvents(list: RawEvent[] | undefined, withScores: boolean): SportsEvent[] {
  return (list ?? [])
    .filter((raw) => raw.strHomeTeam && raw.strAwayTeam && raw.dateEvent)
    .slice(0, MAX_STORED)
    .map((raw) => {
      const event: SportsEvent = {
        home: raw.strHomeTeam as string,
        away: raw.strAwayTeam as string,
        date: raw.dateEvent as string,
      };
      const time = raw.strTime?.slice(0, 5);
      if (time) event.time = time;
      if (raw.strLeague) event.league = raw.strLeague;
      if (withScores) {
        const home = score(raw.intHomeScore);
        const away = score(raw.intAwayScore);
        if (home !== undefined) event.homeScore = home;
        if (away !== undefined) event.awayScore = away;
      }
      return event;
    });
}

/**
 * Sports connector (`server`). Team-only cache key, so every screen following the
 * same team shares one fetch regardless of the view (`mode`) or count. Resolves
 * the team by name, then pulls upcoming fixtures and recent results in parallel;
 * a failure of either (e.g. a premium-gated endpoint) degrades to an empty
 * section rather than failing the whole app. No fetch timestamp in the payload.
 */
export const sportsConnector: AppConnector<SportsConfig, SportsPayload> = {
  cacheKey(config) {
    return `sports:${teamOf(config).toLowerCase()}`;
  },

  async fetchData(
    config: SportsConfig,
    ctx: ConnectorContext,
  ): Promise<ConnectorResult<SportsPayload>> {
    const team = teamOf(config);
    if (!team) {
      throw new Error('sports: missing team');
    }
    const key = apiKey();

    const search = (await fetchJson(
      `${API}/${key}/searchteams.php?t=${encodeURIComponent(team)}`,
      ctx.signal,
    )) as { teams?: Array<{ idTeam?: string; strTeam?: string }> };
    const found = search.teams?.[0];
    if (!found?.idTeam) {
      throw new Error(`sports: team not found: ${team}`);
    }

    const [next, last] = await Promise.all([
      fetchJson(
        `${API}/${key}/eventsnext.php?id=${found.idTeam}`,
        ctx.signal,
      ).catch(() => ({}) as unknown),
      fetchJson(
        `${API}/${key}/eventslast.php?id=${found.idTeam}`,
        ctx.signal,
      ).catch(() => ({}) as unknown),
    ]);

    const upcoming = mapEvents((next as { events?: RawEvent[] }).events, false);
    const results = mapEvents((last as { results?: RawEvent[] }).results, true);

    ctx.logger.debug('sports fetched', {
      team: found.strTeam,
      upcoming: upcoming.length,
      results: results.length,
    });
    return {
      playerPayload: {
        team: found.strTeam ?? team,
        upcoming,
        results,
      },
    };
  },
};

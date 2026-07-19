/**
 * Normalized sports payload — the contract between the backend `sports` connector
 * (TheSportsDB) and the embed bundle. Both the upcoming fixtures and the recent
 * results travel in the payload so the coarse cache key stays team-only and the
 * `mode`/`count` an operator picks are display-only. No fetch timestamp — the
 * fixture list changes with the data (a match played, a new one scheduled), not
 * on a clock tick.
 */
export interface SportsPayload {
  /** Resolved team name, e.g. "Arsenal". */
  team: string
  /** Upcoming fixtures, soonest first. */
  upcoming: SportsEvent[]
  /** Recent results, most recent first. */
  results: SportsEvent[]
}

export interface SportsEvent {
  home: string
  away: string
  /** ISO date `YYYY-MM-DD`. */
  date: string
  /** Local kickoff `HH:MM`, if known. */
  time?: string
  league?: string
  /** Final scores — present on results, absent on upcoming fixtures. */
  homeScore?: number
  awayScore?: number
}

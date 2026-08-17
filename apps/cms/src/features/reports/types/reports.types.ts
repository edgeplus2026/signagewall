/** What one hour of one screen was doing. */
export type CoverageState =
  | 'idle'
  | 'off'
  | 'stuck'
  | 'covered'
  | 'quiet'
  | 'takeover'

export interface CoverageCell {
  state: CoverageState
  /** 1–4 for `covered`, a step on the sequential ramp; 0 otherwise. */
  level: number
  coveredMs: number
  expectedMs: number
  plays: number
}

export interface CoverageRow {
  screenId: string
  name: string
  cells: CoverageCell[]
  /** Null when the screen was closed all day — not measurable, not zero. */
  coverage: number | null
}

export interface CoverageException {
  screenId: string
  screenName: string
  kind: 'off' | 'stuck' | 'takeover'
  fromHour: number
  /** Exclusive: 14 → 18 reads as "14:00 to 18:00". */
  toHour: number
  durationMs: number
  itemName?: string
}

export interface CoverageReport {
  day: string
  /** Present when the matrix is drawn for one item or campaign, not everything. */
  focus?: { kind: 'item' | 'campaign'; id: string; name: string }
  coverage: number | null
  screens: CoverageRow[]
  exceptions: CoverageException[]
  totals: { plays: number; airtimeMs: number; screens: number }
  truncated: boolean
}

export interface PlaybackItemRow {
  contentId: string
  name: string
  campaignId?: string
  campaignName?: string
  kind?: string
  plays: number
  airtimeMs: number
  screens: number
  screenNames: string[]
  /** Share of the range's measured airtime, 0–100. */
  share: number
  firstAt?: string
  lastAt?: string
}

export interface PlaybackItemsReport {
  from: string
  to: string
  items: PlaybackItemRow[]
  campaigns?: PlaybackCampaignRow[]
  totals: { plays: number; airtimeMs: number }
  truncated: boolean
}

export interface PlaybackCampaignRow {
  /** Null for everything that belongs to no campaign yet. */
  campaignId: string | null
  name: string
  plays: number
  airtimeMs: number
  share: number
  screens: number
  items: number
  contentIds: string[]
}

export interface Campaign {
  id: string
  name: string
  startDate?: string
  endDate?: string
  contentIds: string[]
}

/** Plays and measured airtime by hour of day, summed over a range. */
export interface DaypartingReport {
  from: string
  to: string
  plays: number[]
  airtimeMs: number[]
}

export interface PlanRow {
  screenId: string
  screenName: string
  contentId: string
  name: string
  plannedPlays: number
  actualPlays: number
  delta: number
  ratio: number | null
}

export interface PlanReport {
  day: string
  rows: PlanRow[]
  /** True when more screens were eligible than the report resolved. */
  truncated: boolean
  basis: 'current-rotation'
}

export type ReportFrequency = 'daily' | 'weekly' | 'monthly'

export interface ReportSchedule {
  enabled: boolean
  frequency: ReportFrequency
  recipients: string[]
  hour: number
  timezone: string
  lastSentAt?: string
  lastError?: string
}

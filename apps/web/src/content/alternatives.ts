/**
 * Comparison pages: SignageWall vs the three platforms buyers actually shortlist.
 *
 * Two rules, because a comparison page that shades the truth is worth less than
 * no page at all — a reader who catches one wrong number stops believing the
 * other nine:
 *
 * 1. **Every competitor claim is quoted from their own public pages**, with the
 *    date it was checked. Prices move; `verifiedOn` is what tells the next
 *    person reading this file that it needs a re-check.
 * 2. **Every page says where the competitor is better.** Yodeck and OptiSigns
 *    both offer a permanently free tier and both have far more apps than we do.
 *    Pretending otherwise loses the reader who already knows.
 */

export type CompetitorKey = 'yodeck' | 'optisigns' | 'screencloud'

export interface ComparisonRow {
  /** What is being compared, e.g. "Entry price". */
  label: string
  signagewall: string
  competitor: string
}

export interface Comparison {
  key: CompetitorKey
  name: string
  /** ISO date the public claims below were last read off their site. */
  verifiedOn: string
  /** Their own pricing page, so a reader can check us. */
  sourceUrl: string
}

/** Language-independent facts. Copy lives in the message files. */
export const COMPETITORS: Record<CompetitorKey, Comparison> = {
  yodeck: {
    key: 'yodeck',
    name: 'Yodeck',
    verifiedOn: '2026-07-28',
    sourceUrl: 'https://www.yodeck.com/pricing/',
  },
  optisigns: {
    key: 'optisigns',
    name: 'OptiSigns',
    verifiedOn: '2026-07-28',
    sourceUrl: 'https://www.optisigns.com/pricing',
  },
  screencloud: {
    key: 'screencloud',
    name: 'ScreenCloud',
    verifiedOn: '2026-07-28',
    sourceUrl: 'https://screencloud.com/pricing',
  },
}

export const COMPETITOR_KEYS = Object.keys(COMPETITORS) as CompetitorKey[]

export function competitorBySlug(slug: string): Comparison | null {
  // `slug` comes off the URL, so it is any string — the Record's key type says
  // otherwise, hence the explicit membership check rather than a `??`.
  return Object.hasOwn(COMPETITORS, slug) ? COMPETITORS[slug as CompetitorKey] : null
}

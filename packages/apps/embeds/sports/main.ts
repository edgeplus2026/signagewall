import type { SportsEvent, SportsPayload } from '../../src/sports/payload.js'
import { freshnessFooterHtml } from '../_shared/freshness.js'
import { type AppDataMeta, connectToHost } from '../_shared/host-bridge.js'
import { applyTextStyle } from '../_shared/text-style.js'

import '../_shared/base.css'
import './style.css'

const root = document.getElementById('app')

const THEMES: Record<string, { bg: string; text: string }> = {
  light: { bg: '#FFFFFF', text: '#0F172A' },
  dark: { bg: '#0B1220', text: '#E2E8F0' },
}

const dateFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

function formatDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  if (!y || !m || !d) return date
  return dateFormat.format(new Date(y, m - 1, d))
}

function applyChrome(config: Record<string, unknown>): void {
  if (!root) return
  const theme = THEMES[String(config.theme)] ?? THEMES.dark!
  root.style.background = theme.bg
  root.style.color = theme.text
  root.style.setProperty('--sp-accent', '#2563EB')
  applyTextStyle(root, config)
}

function buildRow(event: SportsEvent, isResult: boolean): HTMLElement {
  const row = document.createElement('div')
  row.className = 'sp-row'

  const when = document.createElement('div')
  when.className = 'sp-when'
  const date = document.createElement('span')
  date.className = 'sp-date'
  date.textContent = formatDate(event.date)
  when.append(date)
  if (event.time && !isResult) {
    const time = document.createElement('span')
    time.className = 'sp-time'
    time.textContent = event.time
    when.append(time)
  }

  const match = document.createElement('div')
  match.className = 'sp-match'
  const home = document.createElement('span')
  home.textContent = event.home
  const vs = document.createElement('span')
  vs.className = 'sp-vs'
  vs.textContent = 'v'
  const away = document.createElement('span')
  away.textContent = event.away
  match.append(home, vs, away)

  const tail = document.createElement('div')
  tail.className = 'sp-tail'
  if (
    isResult &&
    typeof event.homeScore === 'number' &&
    typeof event.awayScore === 'number'
  ) {
    const scoreEl = document.createElement('div')
    scoreEl.className = 'sp-score'
    scoreEl.textContent = `${event.homeScore}–${event.awayScore}`
    tail.append(scoreEl)
  } else if (event.league) {
    const league = document.createElement('div')
    league.className = 'sp-league'
    league.textContent = event.league
    tail.append(league)
  }

  row.append(when, match, tail)
  return row
}

function section(
  title: string,
  events: SportsEvent[],
  isResult: boolean,
  withHeading: boolean,
): HTMLElement | null {
  if (events.length === 0) return null
  const frag = document.createElement('div')
  if (withHeading) {
    const heading = document.createElement('div')
    heading.className = 'sp-section'
    heading.textContent = title
    frag.append(heading)
  }
  const list = document.createElement('div')
  list.className = 'sp-list'
  for (const event of events) list.append(buildRow(event, isResult))
  frag.append(list)
  return frag
}

function render(
  config: Record<string, unknown>,
  data: SportsPayload | null,
  meta: AppDataMeta | null,
): void {
  if (!root) return
  applyChrome(config)

  if (!data) {
    root.innerHTML = '<div class="sp"><p class="sp-empty">Loading…</p></div>'
    return
  }

  const mode = String(config.mode || 'upcoming')
  const count =
    typeof config.count === 'number' && config.count > 0 ? config.count : 5
  const showUpcoming = mode !== 'results'
  const showResults = mode !== 'upcoming'
  const both = mode === 'both'

  const wrap = document.createElement('div')
  wrap.className = 'sp'

  const team = document.createElement('div')
  team.className = 'sp-team'
  team.textContent = data.team
  wrap.append(team)

  let any = false
  if (showUpcoming) {
    const el = section('Upcoming', data.upcoming.slice(0, count), false, both)
    if (el) {
      wrap.append(el)
      any = true
    }
  }
  if (showResults) {
    const el = section('Recent', data.results.slice(0, count), true, both)
    if (el) {
      wrap.append(el)
      any = true
    }
  }
  if (!any) {
    const empty = document.createElement('p')
    empty.className = 'sp-empty'
    empty.textContent = 'No fixtures to show'
    wrap.append(empty)
  }

  root.replaceChildren(wrap)
  root.insertAdjacentHTML('beforeend', freshnessFooterHtml(meta))
}

connectToHost<Record<string, unknown>, SportsPayload>(({ config, data, meta }) => {
  render(config, data, meta)
})

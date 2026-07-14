import type { ClockContext } from './context.js'

/**
 * The time, in parts.
 *
 * Split rather than formatted whole because every face styles the pieces
 * separately — the colon pulses on its own, the AM/PM marker is set small and
 * raised, the seconds are a different weight. A face that wanted the string back
 * could always join them; a face handed a string could never take it apart.
 *
 * `formatToParts` rather than string surgery: it gets the zero-padding and the
 * locale's own separator without us reimplementing either.
 */
export interface TimeParts {
  hour: string
  minute: string
  second: string
  /** `AM` / `PM`, or '' on a 24-hour clock. */
  period: string
}

export function timeParts(ctx: ClockContext): TimeParts {
  const parts = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    // `h23` rather than `h24`: h24 renders midnight as "24:00", which is correct
    // and which nobody has ever wanted to see on a wall.
    hourCycle: ctx.hour12 ? 'h12' : 'h23',
  }).formatToParts(ctx.now)

  const find = (type: string): string =>
    parts.find((part) => part.type === type)?.value ?? '00'

  return {
    hour: find('hour'),
    minute: find('minute'),
    second: find('second'),
    period: parts.find((part) => part.type === 'dayPeriod')?.value ?? '',
  }
}

/** `Tuesday, 14 July 2026` — the player's locale, the player's conventions. */
export function dateLabel(now: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(now)
}

/**
 * The angles of the three hands, in degrees clockwise from twelve.
 *
 * The hour and minute hands are CONTINUOUS, not stepped: a real hour hand is most
 * of the way to four at twenty to, and a clock whose hour hand jumps between the
 * numerals is a clock that looks wrong for fifty-nine minutes out of every sixty.
 * The second hand steps, because a quartz movement does.
 */
export function handAngles(now: Date): {
  hour: number
  minute: number
  second: number
} {
  const seconds = now.getSeconds()
  const minutes = now.getMinutes() + seconds / 60
  const hours = (now.getHours() % 12) + minutes / 60

  return {
    hour: hours * 30,
    minute: minutes * 6,
    second: seconds * 6,
  }
}

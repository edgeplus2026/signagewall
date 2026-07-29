'use client'

import { useLocale } from 'next-intl'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

/* Stat values arrive as display strings ("100+", "38"), so the digits are
   pulled out to be animated and whatever surrounds them is put back verbatim.
   A value with no digits at all ("Offline") simply never animates. */
const NUMERIC = /^(\D*)([\d.,\s]*\d)(.*)$/

/* Whole numbers only, with optional thousands grouping. A decimal shares its
   separator with a grouped number, so counting one would mean guessing which
   it is — "99.9%" is left to render untouched rather than counted to 999. */
const WHOLE = /^\d{1,3}(?:[.,\s]\d{3})*$/

const DURATION = 1200

/* The first paint must carry the final number — it is what SSR emits, what a
   reader without JS keeps, and what hydration compares against. Resetting to
   zero therefore has to happen before the browser paints, or the real number
   flashes once and snaps back. useEffect is the SSR stand-in only to keep
   React from warning about a layout effect on the server. */
const useBeforePaint = typeof window === 'undefined' ? useEffect : useLayoutEffect

function parse(value: string) {
  const match = NUMERIC.exec(value)
  if (!match) return null

  const [, prefix = '', digits = '', suffix = ''] = match
  if (!WHOLE.test(digits)) return null

  /* "1,000+" has to keep its grouping while counting, but the separator is
     locale's to choose, so only the fact that one was used is carried over. */
  return {
    prefix,
    suffix,
    target: Number(digits.replace(/\D/g, '')),
    grouped: /[.,\s]/.test(digits),
  }
}

export function CountUp({ value }: { value: string }) {
  const locale = useLocale()
  const ref = useRef<HTMLSpanElement>(null)
  const parsed = useMemo(() => parse(value), [value])
  const [shown, setShown] = useState(parsed?.target ?? 0)

  useBeforePaint(() => {
    const el = ref.current
    if (!el || !parsed) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    setShown(0)

    let frame = 0
    let started = 0

    const step = (now: number) => {
      started ||= now
      const t = Math.min((now - started) / DURATION, 1)
      // Ease-out cubic: fast off the mark, settling onto the number.
      setShown(Math.round(parsed.target * (1 - Math.pow(1 - t, 3))))
      if (t < 1) frame = requestAnimationFrame(step)
    }

    /* One-shot: the count starts when the band first scrolls into view and the
       observer is dropped there, so scrolling back past it never replays it.
       Same viewport thresholds as Reveal, so the band counts as it fades in. */
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          observer.disconnect()
          frame = requestAnimationFrame(step)
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.1 },
    )
    observer.observe(el)

    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [parsed])

  if (!parsed) return value

  return (
    <>
      {/* The count is decoration; a reader is given the settled value instead
          of whatever number the animation happens to be passing through. */}
      <span ref={ref} aria-hidden="true">
        {parsed.prefix}
        {parsed.grouped ? new Intl.NumberFormat(locale).format(shown) : shown}
        {parsed.suffix}
      </span>
      <span className="sr-only">{value}</span>
    </>
  )
}

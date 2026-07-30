'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

import { DashboardScreen, MenuScreen, PromoScreen } from '@/components/marketing/hero-screens'
import { cn } from '@/lib/utils'

/**
 * The hero visual: a television, turned slightly off-axis, playing what a
 * SignageWall screen plays — a menu board, a promotion, an internal dashboard.
 *
 * Screens rather than photographs of rooms: a room inside a television reads as
 * a mistake, and the product is the thing on the glass. Slides enter from the
 * right and leave to the left, the way a playlist advances.
 */
const SLIDES = [
  { id: 'menu', Screen: MenuScreen },
  { id: 'promo', Screen: PromoScreen },
  { id: 'dashboard', Screen: DashboardScreen },
] as const

const INTERVAL_MS = 4000

export function HeroCarousel() {
  const t = useTranslations('home.showcase')
  const [index, setIndex] = useState(0)
  const [previous, setPrevious] = useState<number | null>(null)
  const [paused, setPaused] = useState(false)
  const reduced = useRef(false)

  useEffect(() => {
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  useEffect(() => {
    if (paused || reduced.current) return
    const id = setTimeout(() => {
      setPrevious(index)
      setIndex((i) => (i + 1) % SLIDES.length)
    }, INTERVAL_MS)
    return () => {
      clearTimeout(id)
    }
  }, [index, paused])

  const go = (i: number) => {
    if (i === index) return
    setPrevious(index)
    setIndex(i)
  }

  return (
    <div
      className="relative mx-auto w-full max-w-110"
      onMouseEnter={() => {
        setPaused(true)
      }}
      onMouseLeave={() => {
        setPaused(false)
      }}
    >
      {/* The set. Turned a few degrees off-axis so it reads as an object in the
          room rather than a picture of one, and it turns to face you as the page
          scrolls (the `tv-turn` utility). A literal ink hex, not `bg-brand`:
          that token flips to cream in the dark theme and would turn the
          television inside out. */}
      <div className="tv-turn rounded-[1.6rem] bg-linear-to-b from-[#2a2927] to-[#0c0c0b] p-3.5 shadow-[0_2.5rem_5rem_-1.5rem_rgba(0,0,0,0.65)] ring-1 ring-white/15 sm:p-4">
        <div className="relative aspect-4/5 w-full overflow-hidden rounded-lg bg-black ring-1 ring-black/60">
          {SLIDES.map((slide, i) => (
            <div
              key={slide.id}
              aria-hidden={i !== index}
              className={cn(
                'absolute inset-0',
                i === index && 'translate-x-0 transition-transform duration-700 ease-out',
                i === previous && '-translate-x-full transition-transform duration-700 ease-out',
                i !== index && i !== previous && 'translate-x-full',
              )}
            >
              <slide.Screen />
            </div>
          ))}

          {/* Glass: one diagonal highlight across the panel. Without it the
              picture sits flat on the bezel instead of behind it. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-linear-[125deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0)_38%]"
          />
        </div>

        {/* Standby lamp — the detail that reads "screen" rather than "picture in
            a dark box", and the one place the accent belongs on the device. */}
        <span aria-hidden className="mx-auto mt-2 block size-1 rounded-full bg-accent/70" />
      </div>

      {/* Under the set and centred, in the brand accent — the same control in
          white inside the bottom-right corner is the shape every competitor
          uses. */}
      <div className="mt-6 flex items-center justify-center gap-2">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            aria-label={t('goTo', { n: i + 1 })}
            aria-current={i === index}
            onClick={() => {
              go(i)
            }}
            className={cn(
              'h-1.5 transition-all duration-300',
              i === index ? 'w-6 bg-accent' : 'w-1.5 bg-quaternary hover:bg-rule',
            )}
          />
        ))}
      </div>
    </div>
  )
}

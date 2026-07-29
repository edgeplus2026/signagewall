import { CalendarDays, CloudSun, Newspaper, TrendingUp } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/lib/utils'

function Tile({ className, children, ...props }: ComponentProps<'div'> & { children: ReactNode }) {
  return (
    <div
      className={cn(
        'border border-secondary bg-panel-raised p-4 shadow-sm shadow-black/3',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

const LABEL = 'text-secondary text-[0.65rem] font-medium tracking-widest uppercase'

/**
 * The hero's signature visual: a bento of live-looking "apps" (weather, clock,
 * exchange rates, news, calendar) so the page shows the breadth of SignageWall at a
 * glance. Pure markup — no imagery; a taste of the catalogue.
 *
 * The sample content is translated rather than hard-coded: this is the first
 * thing a visitor looks at, and it used to render Serbian weather, Serbian news
 * and a Serbian calendar on the English home page.
 */
export async function AppBento({ className }: { className?: string }) {
  const t = await getTranslations('home.bento')
  const forecast = t.raw('weather.forecast') as string[]
  const rates = t.raw('fx.rows') as { code: string; value: string }[]
  const events = t.raw('calendar.events') as { time: string; title: string }[]

  return (
    <div className={cn('relative', className)}>
      <div aria-hidden className="absolute -inset-8 -z-10 bg-highlight blur-3xl" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
        {/* Weather — hero tile */}
        <Tile className="col-span-2 flex flex-col justify-between gap-6 sm:col-span-4 sm:row-span-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs tracking-wide text-secondary uppercase">{t('weather.place')}</p>
              <p className="mt-0.5 text-sm text-secondary">{t('weather.condition')}</p>
            </div>
            <CloudSun className="size-8" style={{ color: '#0ea5e9' }} />
          </div>
          <div className="flex items-end justify-between">
            <p className="font-heading text-6xl font-medium tracking-tight tabular-nums">
              {t('weather.temp')}
            </p>
            <div className="flex gap-3 text-xs text-secondary tabular-nums">
              {forecast.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
          </div>
        </Tile>

        {/* Clock */}
        <Tile className="col-span-1 flex flex-col justify-between gap-4 sm:col-span-2">
          <p className={LABEL}>{t('clock.label')}</p>
          <p className="font-heading text-3xl font-medium tracking-tight tabular-nums">
            {t('clock.time')}
          </p>
        </Tile>

        {/* Exchange rates */}
        <Tile className="col-span-1 sm:col-span-2">
          <div className="flex items-center justify-between">
            <p className={LABEL}>{t('fx.label')}</p>
            <TrendingUp className="size-4" style={{ color: '#1f8a65' }} />
          </div>
          <ul className="mt-3 space-y-1.5 text-xs tabular-nums">
            {rates.map((row) => (
              <li key={row.code} className="flex justify-between">
                <span>{row.code}</span>
                <span>{row.value}</span>
              </li>
            ))}
          </ul>
        </Tile>

        {/* News */}
        <Tile className="col-span-2 sm:col-span-3">
          <div className="flex items-center gap-2">
            <Newspaper className="size-4" style={{ color: '#c08532' }} />
            <p className={LABEL}>{t('news.label')}</p>
          </div>
          <p className="mt-2 text-sm leading-snug font-medium">{t('news.headline')}</p>
          <p className="mt-1 text-xs text-secondary">{t('news.time')}</p>
        </Tile>

        {/* Calendar */}
        <Tile className="col-span-2 sm:col-span-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4" style={{ color: '#7c6cf0' }} />
            <p className={LABEL}>{t('calendar.label')}</p>
          </div>
          <ul className="mt-2 space-y-1.5 text-xs">
            {events.map((e) => (
              <li key={e.time} className="flex gap-2.5">
                <span className="text-secondary tabular-nums">{e.time}</span>
                <span>{e.title}</span>
              </li>
            ))}
          </ul>
        </Tile>
      </div>
    </div>
  )
}

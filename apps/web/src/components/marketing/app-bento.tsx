import { CalendarDays, CloudSun, Newspaper, TrendingUp } from 'lucide-react'
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
 * exchange rates, news, calendar) so the page shows the breadth of EdgeRize at a
 * glance. Pure markup — no imagery; a taste of the 37+ apps in the catalog.
 */
export function AppBento({ className }: { className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <div aria-hidden className="absolute -inset-8 -z-10 bg-highlight blur-3xl" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
        {/* Weather — hero tile */}
        <Tile className="col-span-2 flex flex-col justify-between gap-6 sm:col-span-4 sm:row-span-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs tracking-wide text-secondary uppercase">Beograd · Danas</p>
              <p className="mt-0.5 text-sm text-secondary">Sunčano, malo vetra</p>
            </div>
            <CloudSun className="size-8" style={{ color: '#0ea5e9' }} />
          </div>
          <div className="flex items-end justify-between">
            <p className="font-heading text-6xl font-medium tracking-tight tabular-nums">23°</p>
            <div className="flex gap-3 text-xs text-secondary tabular-nums">
              <span>Čet 24°</span>
              <span>Pet 21°</span>
              <span>Sub 19°</span>
            </div>
          </div>
        </Tile>

        {/* Clock */}
        <Tile className="col-span-1 flex flex-col justify-between gap-4 sm:col-span-2">
          <p className={LABEL}>Vreme</p>
          <p className="font-heading text-3xl font-medium tracking-tight tabular-nums">09:41</p>
        </Tile>

        {/* Exchange rates */}
        <Tile className="col-span-1 sm:col-span-2">
          <div className="flex items-center justify-between">
            <p className={LABEL}>Kurs</p>
            <TrendingUp className="size-4" style={{ color: '#1f8a65' }} />
          </div>
          <ul className="mt-3 space-y-1.5 text-xs tabular-nums">
            <li className="flex justify-between">
              <span>EUR</span>
              <span>117,4</span>
            </li>
            <li className="flex justify-between">
              <span>USD</span>
              <span>108,2</span>
            </li>
            <li className="flex justify-between">
              <span>CHF</span>
              <span>125,0</span>
            </li>
          </ul>
        </Tile>

        {/* News */}
        <Tile className="col-span-2 sm:col-span-3">
          <div className="flex items-center gap-2">
            <Newspaper className="size-4" style={{ color: '#c08532' }} />
            <p className={LABEL}>Vesti</p>
          </div>
          <p className="mt-2 text-sm leading-snug font-medium">
            Nova linija gradskog prevoza počinje sa radom
          </p>
          <p className="mt-1 text-xs text-secondary">pre 12 minuta</p>
        </Tile>

        {/* Calendar */}
        <Tile className="col-span-2 sm:col-span-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4" style={{ color: '#7c6cf0' }} />
            <p className={LABEL}>Danas</p>
          </div>
          <ul className="mt-2 space-y-1.5 text-xs">
            <li className="flex gap-2.5">
              <span className="text-secondary tabular-nums">10:00</span>
              <span>Sastanak tima</span>
            </li>
            <li className="flex gap-2.5">
              <span className="text-secondary tabular-nums">13:30</span>
              <span>Prezentacija za klijenta</span>
            </li>
          </ul>
        </Tile>
      </div>
    </div>
  )
}

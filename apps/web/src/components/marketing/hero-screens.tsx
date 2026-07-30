import type { ReactNode } from 'react'

/**
 * The three screens that play inside the hero television: a menu board, an
 * internal dashboard and a shop promotion.
 *
 * Drawn in markup rather than photographed. Stock has no photographs of these —
 * they are designs, not places — and rendering them keeps them sharp at any size
 * and changeable with a copy edit.
 *
 * The wording is deliberately not translated: it is a demonstration of somebody
 * else's screen, not our interface, and a menu that switched language with the
 * site would be pretending to be something it is not.
 *
 * Sizes are in `cqw` against the screen container, so one set of numbers holds
 * from the phone layout up to a wide desktop.
 */

const MENU = [
  { name: 'Espresso', price: '1.80' },
  { name: 'Flat white', price: '2.60' },
  { name: 'Cold brew', price: '2.90' },
  { name: 'Cheesecake', price: '3.90' },
]

const KPIS = [
  { value: '98%', label: 'On-time delivery' },
  { value: '24', label: 'Open tickets' },
]

/* Fixed, not random: the bars must be identical on the server and on the
   client, and identical between one visit and the next. */
const BARS = [42, 58, 51, 73, 66, 88, 79]

const AGENDA = [
  { time: '10:00', text: 'Team stand-up' },
  { time: '13:30', text: 'Client review' },
]

export function MenuScreen() {
  return (
    <Screen className="bg-[#141413] text-[#f2f0ea]">
      <Eyebrow>Today</Eyebrow>
      <ul className="mt-[5.6cqw] flex flex-col gap-[3.6cqw]">
        {MENU.map((item) => (
          <li key={item.name} className="flex items-baseline gap-[2.4cqw]">
            <span className="font-heading text-[4.8cqw] font-medium">{item.name}</span>
            {/* Leader rule, the way a printed board sets a menu — without it the
                prices read as a second, unrelated column. */}
            <span className="h-px flex-1 -translate-y-[0.32cqw] bg-current opacity-25" />
            <span className="font-heading text-[4.8cqw] tabular-nums">{item.price}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto flex items-end justify-between gap-[2.4cqw] border-t border-current/15 pt-[4cqw]">
        <div>
          <p className="text-[2.56cqw] font-semibold tracking-[0.2em] text-[#d85a30] uppercase">
            Special
          </p>
          <p className="mt-[1.2cqw] font-heading text-[5.2cqw] font-semibold">Pumpkin latte</p>
        </div>
        <p className="font-heading text-[7.2cqw] leading-none font-semibold text-[#d85a30] tabular-nums">
          3.20
        </p>
      </div>
    </Screen>
  )
}

export function DashboardScreen() {
  return (
    <Screen className="bg-[#141413] text-[#f2f0ea]">
      <Eyebrow>This week</Eyebrow>
      <div className="mt-[4.8cqw] grid grid-cols-2 gap-[2.4cqw]">
        {KPIS.map((kpi) => (
          <div key={kpi.label} className="bg-white/6 p-[3.2cqw]">
            <p className="font-heading text-[8cqw] leading-none font-semibold tabular-nums">
              {kpi.value}
            </p>
            <p className="mt-[1.6cqw] text-[2.72cqw] leading-tight opacity-60">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-[4cqw]">
        <p className="text-[2.56cqw] font-semibold tracking-[0.2em] uppercase opacity-60">
          Orders shipped
        </p>
        <div className="mt-[2.4cqw] flex h-[17.6cqw] items-end gap-[1.6cqw]">
          {BARS.map((h, i) => (
            <span
              key={h}
              style={{ height: `${h.toString()}%` }}
              className={i === BARS.length - 1 ? 'flex-1 bg-[#d85a30]' : 'flex-1 bg-white/20'}
            />
          ))}
        </div>
      </div>

      <div className="mt-auto border-t border-current/15 pt-[3.2cqw]">
        <p className="text-[2.56cqw] font-semibold tracking-[0.2em] uppercase opacity-60">Today</p>
        <ul className="mt-[2cqw] flex flex-col gap-[1.6cqw]">
          {AGENDA.map((row) => (
            <li key={row.text} className="flex items-baseline gap-[2.4cqw] text-[3.36cqw]">
              <span className="tabular-nums opacity-60">{row.time}</span>
              <span>{row.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </Screen>
  )
}

export function PromoScreen() {
  return (
    <Screen className="justify-center bg-[#d85a30] text-[#1a0d07]">
      <p className="font-heading text-[27.2cqw] leading-[0.85] font-semibold tabular-nums">−30%</p>
      <p className="mt-[3.2cqw] font-heading text-[7.2cqw] leading-tight font-semibold text-balance">
        Spring collection
      </p>
      <p className="mt-[2.4cqw] text-[3.2cqw] leading-snug opacity-80">
        This week only · in store and online
      </p>
    </Screen>
  )
}

function Screen({ className, children }: { className?: string; children: ReactNode }) {
  /* `@container` goes on the wrapper, never on the element that uses `cqw`:
     container units resolve against the nearest *ancestor* container, so a
     `p-[10cqw]` sitting on the container itself measures something else entirely
     and squeezes the content into a column down the middle. */
  return (
    <div className="@container h-full w-full">
      <div className={`flex h-full w-full flex-col p-[10cqw] ${className ?? ''}`}>{children}</div>
    </div>
  )
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[2.72cqw] font-semibold tracking-[0.25em] uppercase opacity-60">
      {children}
    </p>
  )
}

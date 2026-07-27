import { cn } from '@/lib/utils'

/* The mark is a pixel-grid "R" on an 8px lattice — same geometry as the CMS
   favicon so the product and the site read as one brand. Coordinates are the
   top-left of each cell in the 48×48 viewBox. */
type Cell = [x: number, y: number]

const STEM: Cell[] = [5, 13, 21, 29, 37].map((y) => [5, y])
const BOWL: Cell[] = [
  [13, 5],
  [21, 5],
  [29, 5],
  [37, 13],
  [13, 21],
  [21, 21],
  [29, 21],
]
/** The kick — the one place the brand allows colour. */
const LEG: Cell[] = [
  [29, 29],
  [37, 37],
]

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      {/* Tile and pixels ride the brand pair, so the mark inverts with the
          theme instead of vanishing into a dark page. */}
      <rect width="48" height="48" rx="11" fill="var(--brand)" />
      {[...STEM, ...BOWL].map(([x, y]) => (
        <rect
          key={`${x.toString()}-${y.toString()}`}
          x={x}
          y={y}
          width="6"
          height="6"
          rx="1.6"
          fill="var(--brand-contrast)"
        />
      ))}
      {LEG.map(([x, y]) => (
        <rect
          key={`${x.toString()}-${y.toString()}`}
          x={x}
          y={y}
          width="6"
          height="6"
          rx="1.6"
          fill="#cc0000"
        />
      ))}
    </svg>
  )
}

export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className={cn('size-7', markClassName)} />
      <span className="font-heading text-lg font-bold tracking-tight">EdgeRize</span>
    </span>
  )
}

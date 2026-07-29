import { cn } from '@/lib/utils'

/**
 * The mark: four screens laid in two staggered courses, like brickwork, with
 * the wide upper-right one lit. Geometry is verbatim from the brand pack's
 * `signagewall-mark.svg`; only the colours are swapped for theme tokens, so it
 * inverts on a dark page instead of disappearing into it.
 *
 * The gaps between screens are load-bearing: they read as separate displays in
 * separate places rather than one seamless video wall, which is the opposite of
 * what we sell.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 60" fill="none" className={className} aria-hidden>
      <rect
        x="4"
        y="12"
        width="18"
        height="14"
        rx="1.5"
        fill="none"
        stroke="var(--brand)"
        strokeWidth="4"
      />
      <rect x="28" y="10" width="30" height="18" rx="3.5" fill="var(--accent)" />
      <rect
        x="4"
        y="34"
        width="26"
        height="14"
        rx="1.5"
        fill="none"
        stroke="var(--brand)"
        strokeWidth="4"
      />
      <rect
        x="38"
        y="34"
        width="18"
        height="14"
        rx="1.5"
        fill="none"
        stroke="var(--brand)"
        strokeWidth="4"
      />
    </svg>
  )
}

/**
 * Horizontal lockup. The wordmark is set in live Inter to the brand guide's
 * spec — Regular "Signage", Medium "Wall", −2% tracking — rather than the pack's
 * outlined paths, so it inherits the theme colour, stays selectable, and costs
 * no extra asset weight.
 */
export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className={cn('size-8', markClassName)} />
      <span className="font-wordmark text-xl leading-none tracking-[-0.02em] text-primary">
        <span className="font-normal">Signage</span>
        <span className="font-medium">Wall</span>
      </span>
    </span>
  )
}

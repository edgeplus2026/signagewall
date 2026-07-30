/**
 * The 404 illustration: the brand mark blown up into a wall of screens, with one
 * of them showing nothing.
 *
 * It is the mark's own geometry — four screens in two staggered courses, gaps
 * intact — rather than a stock "lost astronaut". The joke is the product's: a
 * screen that lost what it was supposed to show, which is exactly what a missing
 * page is. The dead one is the same screen the logo lights in coral, so the
 * illustration reads as the logo even before it reads as a picture.
 *
 * Pure SVG with currentColor and the theme tokens, so it inverts with the theme
 * and costs no JavaScript.
 */
export function ScreenWall404({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 208"
      fill="none"
      className={className}
      role="img"
      aria-label="Four screens, one of them blank"
    >
      {/* Live screen, top left — content lines standing in for a running playlist. */}
      <g>
        <rect
          x="4"
          y="16"
          width="118"
          height="74"
          rx="6"
          fill="none"
          stroke="var(--border-secondary)"
          strokeWidth="3"
        />
        <rect x="20" y="34" width="60" height="7" rx="3.5" fill="currentColor" opacity="0.22" />
        <rect x="20" y="49" width="86" height="7" rx="3.5" fill="currentColor" opacity="0.14" />
        <rect x="20" y="64" width="42" height="7" rx="3.5" fill="var(--accent)" opacity="0.55" />
      </g>

      {/* The one that lost its signal. Filled, so it carries the weight the lit
          screen carries in the logo — except here it is dark. */}
      <g>
        <rect x="134" y="8" width="182" height="98" rx="8" fill="var(--brand)" />
        <text
          x="225"
          y="66"
          textAnchor="middle"
          className="font-heading"
          fontSize="44"
          fontWeight="600"
          letterSpacing="2"
          fill="var(--brand-contrast)"
          opacity="0.92"
        >
          404
        </text>
        {/* The sweep. One thin coral line crossing the dead panel, the way a
            screen looks for a signal it is not going to find. */}
        <rect
          className="screen-scan"
          x="134"
          y="8"
          width="182"
          height="2"
          fill="var(--accent)"
          opacity="0.9"
        />
      </g>

      {/* Live screen, bottom left. */}
      <g>
        <rect
          x="4"
          y="102"
          width="156"
          height="74"
          rx="6"
          fill="none"
          stroke="var(--border-secondary)"
          strokeWidth="3"
        />
        <rect x="20" y="120" width="94" height="7" rx="3.5" fill="currentColor" opacity="0.2" />
        <rect x="20" y="135" width="120" height="7" rx="3.5" fill="currentColor" opacity="0.12" />
        <rect x="20" y="150" width="56" height="7" rx="3.5" fill="currentColor" opacity="0.12" />
      </g>

      {/* Live screen, bottom right. */}
      <g>
        <rect
          x="172"
          y="118"
          width="144"
          height="74"
          rx="6"
          fill="none"
          stroke="var(--border-secondary)"
          strokeWidth="3"
        />
        <rect x="188" y="136" width="70" height="7" rx="3.5" fill="currentColor" opacity="0.2" />
        <rect x="188" y="151" width="108" height="7" rx="3.5" fill="currentColor" opacity="0.12" />
        <rect x="188" y="166" width="38" height="7" rx="3.5" fill="var(--accent)" opacity="0.45" />
      </g>
    </svg>
  )
}

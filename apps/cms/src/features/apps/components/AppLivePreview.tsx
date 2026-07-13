import type { ReactNode } from 'react'

import { resolveAppColor } from '@/features/apps/lib/appColor'
import { cn } from '@/lib/utils'

interface AppLivePreviewProps {
  /** Brand colour (hex) for the ambient light behind the device. */
  color?: string
  children: ReactNode
  className?: string
}

/**
 * Fine-grained noise, tiled behind the glow. A wash this large and this dark is
 * where 8-bit colour runs out of steps and the falloff turns into visible rings;
 * a touch of grain dithers the boundary away. It is the same trick film grain
 * plays — cheaper than nothing, and the only thing that actually kills banding.
 */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E\")"

/**
 * A full TV device mock (screen + bezel + neck + stand) used to render the
 * live preview of an app instance. Designing the whole device — rather than
 * just a border — gives the premium showroom look.
 */
export function AppLivePreview({ color, children, className }: AppLivePreviewProps) {
  const light = resolveAppColor(color)

  /**
   * The app's colour at a given strength. Ramping to `transparent` would ramp to
   * *black with zero alpha*, which drags the midtones grey and muddies the glow;
   * mixing the same hue down to 0% keeps the ramp in-hue.
   */
  const tint = (strength: number) => `color-mix(in srgb, ${light} ${String(strength)}%, transparent)`

  /**
   * Light does not fall off linearly, and a blurred solid box does. That is what
   * makes a box read as a blurred box instead of as a lamp: a flat core with a
   * straight edge ramp. These stops approximate a gaussian tail — steep at the
   * centre, long and shallow at the rim — so there is no shape to see.
   */
  const wash = [
    `radial-gradient(ellipse 55% 48% at 50% 40%,`,
    `${tint(50)} 0%, ${tint(31)} 24%, ${tint(15)} 44%,`,
    `${tint(6)} 62%, ${tint(2)} 78%, ${tint(0)} 92%)`,
  ].join(' ')

  const pool = [
    `radial-gradient(ellipse 46% 50% at 50% 50%,`,
    `${tint(30)} 0%, ${tint(12)} 38%, ${tint(3)} 66%, ${tint(0)} 88%)`,
  ].join(' ')

  /** Confines the grain to the halo — it follows the wash, and so has no edge. */
  const grainMask = [
    `radial-gradient(ellipse 55% 48% at 50% 40%,`,
    `#000 0%, rgb(0 0 0 / 0.85) 42%, rgb(0 0 0 / 0.35) 66%, rgb(0 0 0 / 0) 88%)`,
  ].join(' ')

  return (
    <div className={cn('relative isolate flex w-full flex-col items-center', className)}>
      {/* Ambient bias light: the app's colour bounced off the wall behind the
          panel and pooled on the surface the stand rests on.

          True Ambilight samples the picture, which a cross-origin preview iframe
          forbids — the app's brand colour stands in for it.

          The light lives in its own box, one size up from the device but never
          wider than the column: it spills well past the bezel, yet never reaches
          the page's scroll container, which would clip it on the right (the
          preview is the last column) and leave the glow lopsided. Vertical spill
          is free — the device is centred in a tall column — so it bleeds above
          and below. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -inset-y-20 -z-10 mx-auto w-full max-w-3xl"
      >
        <div className="absolute inset-0" style={{ backgroundImage: wash }} />
        <div className="absolute inset-x-[24%] bottom-2 h-28" style={{ backgroundImage: pool }} />
        {/* Masked to the halo itself. Left as a plain rectangle it tints its own
            box a shade lighter than the page and the box becomes visible — the
            grain has to live inside the light, not on top of the page. */}
        <div
          className="absolute inset-0 opacity-[0.07] mix-blend-overlay"
          style={{ backgroundImage: GRAIN, maskImage: grainMask, WebkitMaskImage: grainMask }}
        />
      </div>

      <div className="w-full max-w-xl">
        {/* Screen + bezel. The coloured shadows are the backlight itself: a
            box-shadow follows the panel's rounded silhouette and falls off the way
            a real lamp does, which no blurred rectangle behind it can imitate. The
            black one underneath is the weight — light alone reads as a sticker. */}
        <div
          className="rounded-2xl bg-neutral-950 p-3 ring-1 ring-white/10"
          style={{
            boxShadow: [
              `0 0 44px -10px ${tint(55)}`,
              `0 22px 70px -28px ${tint(45)}`,
              `0 30px 60px -30px rgb(0 0 0 / 0.85)`,
            ].join(', '),
          }}
        >
          <div className="aspect-video w-full overflow-hidden rounded-lg bg-black ring-1 ring-black/40">
            {children}
          </div>
          <div className="mt-2 flex items-center justify-center">
            <span className="size-1.5 rounded-full bg-white/20" />
          </div>
        </div>
      </div>

      {/* Neck */}
      <div className="h-6 w-16 rounded-b-md bg-linear-to-b from-neutral-800 to-neutral-900" />
      {/* Stand — catches the light it is standing in. */}
      <div
        className="h-2.5 w-44 rounded-full bg-neutral-800"
        style={{ boxShadow: `0 6px 24px -6px ${tint(35)}, 0 2px 6px rgb(0 0 0 / 0.6)` }}
      />
    </div>
  )
}

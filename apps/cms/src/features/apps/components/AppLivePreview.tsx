import type { ReactNode } from 'react'

import { resolveAppColor } from '@/features/apps/lib/appColor'
import { cn } from '@/lib/utils'

interface AppLivePreviewProps {
  /** Brand colour (hex) for the soft glow behind the device. */
  color?: string
  children: ReactNode
  className?: string
}

/**
 * A full TV device mock (screen + bezel + neck + stand) used to render the
 * live preview of an app instance. Designing the whole device — rather than
 * just a border — gives the premium showroom look.
 */
export function AppLivePreview({ color, children, className }: AppLivePreviewProps) {
  return (
    <div className={cn('flex w-full flex-col items-center', className)}>
      <div className="relative isolate w-full max-w-3xl">
        {/* Kept inside the device bounds (no negative offsets / smaller blur) so a
            parent overflow-hidden scroll container doesn't clip it. */}
        <div
          aria-hidden
          className="absolute inset-x-16 bottom-6 top-16 -z-10 rounded-[3rem] opacity-30 blur-2xl"
          style={{ backgroundColor: resolveAppColor(color) }}
        />

        {/* Screen + bezel */}
        <div className="rounded-2xl bg-neutral-950 p-3 shadow-2xl ring-1 ring-white/10">
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
      {/* Stand */}
      <div className="h-2.5 w-44 rounded-full bg-neutral-800 shadow-md" />
    </div>
  )
}

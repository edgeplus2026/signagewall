import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface AppLivePreviewProps {
  /** Kept for API compatibility; no longer used (ambient light was removed). */
  color?: string
  children: ReactNode
  className?: string
}

/**
 * A TV device mock (screen + bezel) used to render the live preview of an app
 * instance. Flat — no ambient backlight or drop shadow, no stand.
 */
export function AppLivePreview({ children, className }: AppLivePreviewProps) {
  return (
    <div className={cn('relative isolate flex w-full flex-col items-center', className)}>
      <div className="w-full max-w-xl">
        {/* Screen + bezel. */}
        <div className="rounded-2xl bg-neutral-950 p-3 ring-1 ring-white/10">
          <div className="aspect-video w-full overflow-hidden rounded-lg bg-black ring-1 ring-black/40">
            {children}
          </div>
          <div className="mt-2 flex items-center justify-center">
            <span className="size-1.5 rounded-full bg-white/20" />
          </div>
        </div>
      </div>
    </div>
  )
}

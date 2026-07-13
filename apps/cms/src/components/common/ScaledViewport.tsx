import { type ReactNode, useLayoutEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

interface ScaledViewportProps {
  /** Virtual viewport the children are laid out in. Defaults to 1080p. */
  width?: number
  height?: number
  children: ReactNode
  className?: string
}

/**
 * Lays its children out in a fixed virtual viewport (1920×1080 by default) and
 * shrinks the whole thing to fit the box it's given.
 *
 * This is what makes a preview a *true* miniature of the display. Rendering an
 * app into a ~700px-wide iframe does not show what a 1080p screen shows: apps
 * size themselves in `vw`/`vh` (see `styleFields`), so at 700px every `vw` is
 * worth a third of what it is on the real screen and the `clamp()` floors the
 * apps use for legibility kick in — text ends up relatively huge and the layout
 * breaks differently than it ever would in playback. Sizing the viewport to the
 * real display and scaling it down with a transform keeps every unit resolving
 * exactly as it does on the screen; the preview is then just a smaller picture
 * of the same render.
 */
export function ScaledViewport({
  width = 1920,
  height = 1080,
  children,
  className,
}: ScaledViewportProps) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const [scale, setScale] = useState<number | null>(null)

  useLayoutEffect(() => {
    const box = boxRef.current
    if (!box) {
      return
    }
    const fit = () => {
      const { width: boxWidth, height: boxHeight } = box.getBoundingClientRect()
      setScale(Math.min(boxWidth / width, boxHeight / height))
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(box)
    return () => {
      observer.disconnect()
    }
  }, [width, height])

  return (
    <div ref={boxRef} className={cn('relative size-full overflow-hidden', className)}>
      <div
        // Hidden until measured so the children never flash at full 1920×1080.
        className={cn('absolute left-0 top-0 origin-top-left', scale === null && 'invisible')}
        style={{ width, height, transform: `scale(${String(scale ?? 1)})` }}
      >
        {children}
      </div>
    </div>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

type RevealProps = ComponentProps<'div'> & { delay?: number }

export function Reveal({ className, delay = 0, style, ...props }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShown(true)
          observer.disconnect()
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.1 },
    )
    observer.observe(el)

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <div
      ref={ref}
      /* Marks the element for the no-JavaScript fallback in the layout: without
         it, a visitor (or a crawler) without JS gets a page of empty sections,
         because the reveal never fires and opacity stays at 0. */
      data-reveal=""
      style={delay ? { ...style, transitionDelay: `${delay.toString()}ms` } : style}
      className={cn(
        'transition-all duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none',
        shown ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
        className,
      )}
      {...props}
    />
  )
}

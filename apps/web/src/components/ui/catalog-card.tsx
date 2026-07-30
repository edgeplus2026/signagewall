import { ArrowUpRight } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'

import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

/**
 * The one card for a linked catalogue entry — an app, an industry, anything the
 * site lists as a grid of "here is a thing, go read about it".
 *
 * It exists because /apps and /solutions each grew their own card and the two
 * stopped matching: one was a plain framed cell, the other led with a filled
 * coral band that shouted across the page. A catalogue is exactly the place
 * where every cell must look like it came from the same drawing, so the drawing
 * lives here and the callers only supply the icon and the link.
 *
 * The icon tile is the brand mark's coral square, held back until hover so a
 * grid of forty doesn't turn into confetti.
 */
export function CatalogCard({
  href,
  icon,
  name,
  tagline,
  className,
}: {
  href: ComponentProps<typeof Link>['href']
  icon: ReactNode
  name: string
  tagline: string
  /* `| undefined` explicitly: the repo runs `exactOptionalPropertyTypes`, so an
     optional prop does not accept an explicitly-passed undefined without it. */
  className?: string | undefined
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group relative flex flex-col gap-5 border border-secondary bg-panel p-6 transition-colors hover:border-accent',
        className,
      )}
    >
      <span className="flex size-12 shrink-0 items-center justify-center border border-primary text-primary transition-colors duration-200 group-hover:border-accent group-hover:bg-accent group-hover:text-accent-contrast">
        {icon}
      </span>
      <span className="min-w-0">
        {/* The entry name is the card's heading — h3 under the h2 the section
            header renders, so a listing page has an outline instead of flat h2s. */}
        <h3 className="flex items-center gap-1 font-heading text-base font-semibold tracking-tight">
          {name}
          <ArrowUpRight className="size-4 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
        </h3>
        <span className="mt-2 block text-sm text-pretty text-secondary">{tagline}</span>
      </span>
    </Link>
  )
}

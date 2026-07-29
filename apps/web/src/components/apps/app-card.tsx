import { ArrowUpRight } from 'lucide-react'

import { AppIcon } from '@/components/apps/app-icon'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

export interface AppCardData {
  slug: string
  name: string
  tagline: string
  icon: string
}

/**
 * The one app card. Used by the catalogue grid and by "related apps" — they had
 * drifted into two different mediocre cards, and a catalogue is exactly the
 * place where every cell must look like it came from the same drawing.
 *
 * The icon tile is the brand mark's coral square, held back until hover so a
 * grid of forty doesn't turn into confetti.
 */
export function AppCard({
  slug,
  name,
  tagline,
  icon,
  className,
}: AppCardData & { className?: string }) {
  return (
    <Link
      href={{ pathname: '/apps/[slug]', params: { slug } }}
      className={cn(
        'group relative flex flex-col gap-5 border border-secondary bg-panel p-6 transition-colors hover:border-accent',
        className,
      )}
    >
      <span className="flex size-12 shrink-0 items-center justify-center border border-primary text-primary transition-colors duration-200 group-hover:border-accent group-hover:bg-accent group-hover:text-accent-contrast">
        <AppIcon svg={icon} className="size-6" />
      </span>
      <span className="min-w-0">
        {/* The app name is this card's heading — h3 under the category h2 the
            browser renders, so /apps has an outline instead of 12 flat h2s. */}
        <h3 className="flex items-center gap-1 font-heading text-base font-semibold tracking-tight">
          {name}
          <ArrowUpRight className="size-4 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
        </h3>
        <span className="mt-2 block text-sm text-pretty text-secondary">{tagline}</span>
      </span>
    </Link>
  )
}

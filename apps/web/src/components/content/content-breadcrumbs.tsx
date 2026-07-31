import { ChevronRight } from 'lucide-react'
import type { ComponentProps, Key, ReactNode } from 'react'

import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

export interface ContentBreadcrumbItem {
  /** Stable key for crumbs whose label can change between locales. */
  id?: Key | undefined
  label: ReactNode
  /**
   * Omit the href for the current page. The final crumb is also treated as the
   * current page when an href is supplied accidentally, so a breadcrumb never
   * links a page back to itself.
   */
  href?: ComponentProps<typeof Link>['href'] | undefined
}

export interface ContentBreadcrumbsProps {
  /** Localised accessible name, for example "Breadcrumbs" / "Putanja". */
  ariaLabel: string
  items: readonly ContentBreadcrumbItem[]
  className?: string | undefined
}

/**
 * Visible, locale-aware breadcrumbs. Keep the same item array beside the
 * BreadcrumbJsonLd call so the path a visitor sees and the path a crawler reads
 * cannot drift apart.
 */
export function ContentBreadcrumbs({ ariaLabel, items, className }: ContentBreadcrumbsProps) {
  if (items.length === 0) return null

  return (
    <nav aria-label={ariaLabel} className={cn('text-sm text-secondary', className)}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1 || !item.href

          return (
            <li
              key={item.id ?? index}
              className="flex min-w-0 items-center gap-2"
              aria-current={isCurrent ? 'page' : undefined}
            >
              {index > 0 ? (
                <ChevronRight aria-hidden className="size-3.5 shrink-0 text-secondary/60" />
              ) : null}
              {!isCurrent && item.href ? (
                <Link
                  href={item.href}
                  className="transition-colors hover:text-accent hover:underline hover:underline-offset-4"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="max-w-64 truncate text-primary">{item.label}</span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

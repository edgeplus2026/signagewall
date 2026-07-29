'use client'

import { Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import { AppCard, type AppCardData } from '@/components/apps/app-card'
import { cn } from '@/lib/utils'

export interface AppGroup {
  slug: string
  name: string
  apps: AppCardData[]
}

interface Labels {
  placeholder: string
  all: string
  empty: string
  results: string
}

/**
 * The catalogue reads as a sectioned index — a heading per category, then its
 * grid — rather than one undifferentiated wall of cards filtered by badges.
 * Searching collapses the sections into a single result set, because at that
 * point the taxonomy is not what the reader is scanning by.
 */
export function AppsBrowser({ groups, labels }: { groups: AppGroup[]; labels: Labels }) {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string | null>(null)

  const trimmed = query.trim().toLowerCase()
  const searching = trimmed !== ''

  const visible = useMemo(() => {
    const scoped = cat === null ? groups : groups.filter((g) => g.slug === cat)
    if (!searching) return scoped

    const hits = scoped
      .flatMap((g) => g.apps)
      .filter(
        (a) => a.name.toLowerCase().includes(trimmed) || a.tagline.toLowerCase().includes(trimmed),
      )
    // Dedupe: an app in two categories would otherwise appear twice in results.
    const seen = new Set<string>()
    const apps = hits.filter((a) => (seen.has(a.slug) ? false : (seen.add(a.slug), true)))
    return apps.length ? [{ slug: '__results', name: labels.results, apps }] : []
  }, [groups, cat, searching, trimmed, labels.results])

  const chip = (active: boolean) =>
    cn(
      'border px-3.5 py-1.5 text-sm transition-colors',
      active
        ? 'border-accent bg-accent text-accent-contrast'
        : 'border-secondary text-secondary hover:border-accent hover:text-accent',
    )

  return (
    <div>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-secondary" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
            }}
            placeholder={labels.placeholder}
            className="h-11 w-full border border-secondary bg-page pr-10 pl-10 text-sm transition-colors outline-none placeholder:text-secondary/60 focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
          />
          {searching ? (
            <button
              type="button"
              aria-label="Clear"
              onClick={() => {
                setQuery('')
              }}
              className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center text-secondary transition-colors hover:text-primary"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setCat(null)
          }}
          className={chip(cat === null)}
        >
          {labels.all}
        </button>
        {groups.map((g) => (
          <button
            key={g.slug}
            type="button"
            onClick={() => {
              setCat(g.slug)
            }}
            className={chip(cat === g.slug)}
          >
            {g.name}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="mt-20 text-center text-secondary">{labels.empty}</p>
      ) : (
        <div className="mt-14 flex flex-col gap-16">
          {visible.map((group) => (
            /* The id is the anchor the home page's category grid links to;
               scroll-mt clears the sticky header so the heading isn't left
               tucked underneath it after the jump. */
            <section key={group.slug} id={group.slug} className="scroll-mt-28">
              {/* Coral tick, title, then a rule to the far edge — the same
                  registration language the block frames use. */}
              <div className="flex items-center gap-4">
                <span aria-hidden className="size-2.5 shrink-0 bg-accent" />
                <h2 className="font-heading text-xl font-semibold tracking-tight">{group.name}</h2>
                <span className="text-sm text-secondary tabular-nums">{group.apps.length}</span>
                <span aria-hidden className="h-px flex-1 bg-rule" />
              </div>

              {/* Separate framed cells rather than a shared-hairline grid: a
                  category with a part-full last row would otherwise leave the
                  rule colour showing through as empty grey boxes. */}
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {group.apps.map((a) => (
                  <AppCard key={a.slug} {...a} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

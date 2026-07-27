'use client'

import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { AppIcon } from '@/components/apps/app-icon'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

interface AppItem {
  slug: string
  name: string
  tagline: string
  icon: string
  categories: string[]
}

interface Category {
  slug: string
  name: string
}

interface Labels {
  placeholder: string
  all: string
  empty: string
}

export function AppsBrowser({
  apps,
  categories,
  labels,
}: {
  apps: AppItem[]
  categories: Category[]
  labels: Labels
}) {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return apps.filter((a) => {
      const inCat = cat === null || a.categories.includes(cat)
      const inQuery =
        q === '' || a.name.toLowerCase().includes(q) || a.tagline.toLowerCase().includes(q)
      return inCat && inQuery
    })
  }, [apps, query, cat])

  const pill = (active: boolean) =>
    cn(
      'rounded-full border px-3.5 py-1.5 text-sm transition-colors',
      active
        ? 'border-primary bg-brand text-brand-contrast'
        : 'border-secondary text-secondary hover:text-primary hover:border-primary',
    )

  return (
    <div>
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-secondary" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
          }}
          placeholder={labels.placeholder}
          className="h-11 w-full rounded-md border border-secondary bg-page pr-4 pl-10 text-sm transition-colors outline-none placeholder:text-secondary/60 focus-visible:border-tertiary focus-visible:ring-2 focus-visible:ring-tertiary"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setCat(null)
          }}
          className={pill(cat === null)}
        >
          {labels.all}
        </button>
        {categories.map((c) => (
          <button
            key={c.slug}
            type="button"
            onClick={() => {
              setCat(c.slug)
            }}
            className={pill(cat === c.slug)}
          >
            {c.name}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-16 text-center text-secondary">{labels.empty}</p>
      ) : (
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <Link
              key={a.slug}
              href={`/apps/${a.slug}`}
              className="group flex items-start gap-4 rounded-xl border border-secondary bg-panel p-5 transition-colors hover:border-primary"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-secondary bg-page text-primary">
                <AppIcon svg={a.icon} className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-medium">{a.name}</span>
                <span className="mt-0.5 block text-sm text-secondary">{a.tagline}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

import { AppWindowIcon, SearchIcon } from "lucide-react"
import { useMemo, useState } from "react"

import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useAllAppInstances, useApps } from "@/features/apps/hooks/useApps"
import { LibraryAppCard } from "@/features/content/components/LibraryCards"
import type { LibraryTabPanelProps } from "@/features/content/registry/libraryTabRegistry"

/**
 * Apps library tab. Shows every app instance in the org as a card identical to
 * the media/playlist library cards (icon thumbnail + name + add button), in a
 * flat 2-column grid. Search filters by instance name. Instances are joined to
 * the app catalog by `appSlug` so each card renders the app's brand icon.
 */
export function AppLibraryPanel({ labels, onAddApp }: LibraryTabPanelProps) {
  const [search, setSearch] = useState("")

  const { data: instances = [], isLoading: instancesLoading } =
    useAllAppInstances()
  const { data: catalog = [], isLoading: catalogLoading } = useApps()
  const isLoading = instancesLoading || catalogLoading

  const filtered = useMemo(() => {
    // Overlay apps (ticker) never join a rotation — they pick their screens in
    // their own settings, so offering them here would only mislead.
    const overlaySlugs = new Set(
      catalog.filter((entry) => entry.overlay).map((entry) => entry.slug),
    )
    const addable = instances.filter(
      (instance) => !overlaySlugs.has(instance.appSlug),
    )
    const query = search.trim().toLowerCase()
    if (!query) return addable
    return addable.filter((instance) =>
      instance.name.toLowerCase().includes(query),
    )
  }, [instances, catalog, search])

  return (
    <>
      <div className="relative">
        <SearchIcon className="text-secondary pointer-events-none absolute top-1/2 left-2 size-3 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
          }}
          placeholder={labels.appsSearch ?? labels.librarySearch}
          className="h-7 pl-7 text-xs"
        />
      </div>

      <div className="visible-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="aspect-4/3 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={search.trim() ? labels.libraryEmptySearch : labels.libraryEmpty}
          />
        ) : onAddApp ? (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((instance) => (
              <LibraryAppCard
                key={instance.id}
                instance={instance}
                app={catalog.find((entry) => entry.slug === instance.appSlug)}
                onAddToContent={onAddApp}
              />
            ))}
          </div>
        ) : null}
      </div>
    </>
  )
}

function EmptyState({ title }: { title: string }) {
  return (
    <Empty className="py-10">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <AppWindowIcon aria-hidden />
        </EmptyMedia>
        <EmptyTitle className="text-sm">{title}</EmptyTitle>
      </EmptyHeader>
    </Empty>
  )
}

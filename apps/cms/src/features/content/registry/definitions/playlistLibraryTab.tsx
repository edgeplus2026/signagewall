import { ListVideoIcon, SearchIcon } from "lucide-react"
import { useMemo, useState } from "react"

import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { LibraryPlaylistCard } from "@/features/content/components/LibraryCards"
import type { LibraryTabPanelProps } from "@/features/content/registry/libraryTabRegistry"
import { usePlaylists } from "@/features/playlists/hooks/usePlaylists"

export function PlaylistLibraryPanel({
  labels,
  onAddPlaylist,
  onUpdatePlaylist,
}: LibraryTabPanelProps) {
  const [search, setSearch] = useState("")
  const { data: playlists = [], isLoading } = usePlaylists()

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return playlists
    return playlists.filter((playlist) =>
      playlist.name.toLowerCase().includes(query),
    )
  }, [playlists, search])

  return (
    <>
      <div className="relative">
        <SearchIcon className="text-secondary pointer-events-none absolute top-1/2 left-2 size-3 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
          }}
          placeholder={labels.playlistsSearch}
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
          <Empty className="py-10">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ListVideoIcon aria-hidden />
              </EmptyMedia>
              <EmptyTitle className="text-sm">
                {search.trim() ? labels.playlistsEmptySearch : labels.playlistsEmpty}
              </EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : onAddPlaylist ? (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((playlist) => (
              <LibraryPlaylistCard
                key={playlist.id}
                playlist={playlist}
                onAddToContent={onAddPlaylist}
                {...(onUpdatePlaylist ? { onUpdatePlaylist } : {})}
              />
            ))}
          </div>
        ) : null}
      </div>
    </>
  )
}

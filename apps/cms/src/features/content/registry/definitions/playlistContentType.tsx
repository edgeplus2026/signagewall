import { ListVideoIcon, PencilIcon } from "lucide-react"

import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import {
  LibraryPlaylistCardOverlay,
  PlaylistLibraryDragOverlayRow,
} from "@/features/content/components/LibraryCards"
import { createPlaylistDraftItem } from "@/features/content/lib/contentDraft"
import type { ContentTypeDefinition } from "@/features/content/registry/contentType.types"
import { usePlaylists } from "@/features/playlists/hooks/usePlaylists"
import type {
  Playlist,
  PlaylistSummary,
} from "@/features/playlists/types/playlist.types"

type PlaylistMeta = Playlist | PlaylistSummary

/**
 * Playlist metadata comes from the single global playlists query, not per-id
 * fetches. `collectKeys` returns the ids present so the resolver can index them;
 * `useResolvedMap` ignores the keys (the global query already holds every one).
 */
function useResolvedPlaylistMap(keys: string[]): Map<string, PlaylistMeta | null> {
  const { data: playlists = [] } = usePlaylists()
  return new Map(
    keys.map((id) => [id, playlists.find((playlist) => playlist.id === id) ?? null]),
  )
}

export const playlistContentType: ContentTypeDefinition<PlaylistMeta> = {
  id: "playlist",

  metadata: {
    collectKeys: (items) => [
      ...new Set(
        items
          .filter(
            (item): item is typeof item & { playlistId: string } =>
              item.type === "playlist" && Boolean(item.playlistId),
          )
          .map((item) => item.playlistId),
      ),
    ],
    useResolvedMap: useResolvedPlaylistMap,
    getKey: (item) =>
      item.type === "playlist" ? (item.playlistId ?? null) : null,
  },

  capabilities: {
    // Duration is derived from the playlist itself: shown disabled, not editable.
    showsDurationInput: () => true,
    canEditDuration: () => false,
  },

  card: {
    title: ({ meta, labels }) => meta?.name ?? labels.unknownPlaylist,
    typeLabel: ({ labels }) => labels.playlistType,
    badgeClassName: () => "bg-sidebar text-secondary",
    Thumbnail: ({ meta }) =>
      meta?.thumbnailUrl ? (
        <img src={meta.thumbnailUrl} alt="" className="size-full object-cover" />
      ) : (
        <div className="bg-sidebar flex size-full items-center justify-center">
          <ListVideoIcon className="text-secondary size-10" />
        </div>
      ),
    MenuItems: ({ meta, labels, t, onUpdate }) =>
      meta && onUpdate ? (
        <DropdownMenuItem
          onClick={() => {
            onUpdate(meta)
          }}
        >
          <PencilIcon />
          {labels.updatePlaylist ?? t("playlists.manage.sidebar.edit")}
        </DropdownMenuItem>
      ) : null,
    LibraryDragOverlay: ({ meta, isCustomSidebar, width, height }) =>
      isCustomSidebar ? (
        <LibraryPlaylistCardOverlay playlist={meta} />
      ) : (
        <PlaylistLibraryDragOverlayRow
          playlist={meta}
          {...(width !== undefined ? { width } : {})}
          {...(height !== undefined ? { height } : {})}
        />
      ),
  },

  createDraftItem: (source) => createPlaylistDraftItem(source.id),

  signatureFields: (item) => item.playlistId ?? "",

  isSavable: (item) => item.type === "playlist" && Boolean(item.playlistId),

  toSavePayload: (item) => ({
    ...(item.serverId ? { id: item.serverId } : {}),
    type: "playlist",
    ...(item.playlistId ? { playlistId: item.playlistId } : {}),
    duration: item.duration,
    ...(item.disabled ? { disabled: true } : {}),
  }),
}

import { useQueries } from "@tanstack/react-query"
import { PencilIcon } from "lucide-react"

import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import {
  LibraryDragOverlayRow,
  LibraryMediaCardOverlay,
} from "@/features/content/components/LibraryCards"
import { createMediaDraftItem } from "@/features/content/lib/contentDraft"
import type { ContentTypeDefinition } from "@/features/content/registry/contentType.types"
import { mediaApi } from "@/features/media/api/mediaApi"
import { MediaThumbnail } from "@/features/media/components/MediaThumbnail"
import type { MediaItem } from "@/features/media/types/media.types"
import { cn } from "@/lib/utils"

/**
 * Media metadata is fetched per-id (the same media may appear multiple times in
 * a playlist; deduping shares one query and avoids duplicate `useQueries` keys).
 */
function useResolvedMediaMap(keys: string[]): Map<string, MediaItem | null> {
  const queries = useQueries({
    queries: keys.map((id) => ({
      queryKey: ["media", "item", id],
      queryFn: () => mediaApi.get(id),
      enabled: Boolean(id),
    })),
  })

  const map = new Map<string, MediaItem | null>()
  keys.forEach((id, index) => {
    map.set(id, queries[index]?.data ?? null)
  })
  return map
}

export const mediaContentType: ContentTypeDefinition<MediaItem> = {
  id: "media",

  metadata: {
    collectKeys: (items) => [
      ...new Set(
        items
          .filter(
            (item): item is typeof item & { mediaId: string } =>
              item.type === "media" && Boolean(item.mediaId),
          )
          .map((item) => item.mediaId),
      ),
    ],
    useResolvedMap: useResolvedMediaMap,
    getKey: (item) => (item.type === "media" ? (item.mediaId ?? null) : null),
  },

  capabilities: {
    showsDurationInput: true,
    canEditDuration: (_item, meta) => meta?.type === "image",
  },

  card: {
    title: ({ meta, labels }) => meta?.name ?? labels.unknownMedia,
    typeLabel: ({ meta, t }) => (meta ? t(`media.types.${meta.type}`) : "—"),
    badgeClassName: ({ meta }) =>
      cn(
        meta?.type === "image"
          ? "bg-warning/10 text-warning"
          : meta?.type === "video"
            ? "bg-success/10 text-success"
            : "bg-sidebar text-secondary",
      ),
    Thumbnail: ({ meta, labels }) =>
      meta ? (
        <MediaThumbnail item={meta} iconClassName="size-8" />
      ) : (
        <div className="text-secondary flex size-full items-center justify-center text-xs">
          {labels.mediaUnavailable}
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
          {labels.update ?? t("playlists.manage.sidebar.edit")}
        </DropdownMenuItem>
      ) : null,
    LibraryDragOverlay: ({ meta, isCustomSidebar, width, height }) =>
      isCustomSidebar ? (
        <LibraryMediaCardOverlay item={meta} />
      ) : (
        <LibraryDragOverlayRow
          item={meta}
          {...(width !== undefined ? { width } : {})}
          {...(height !== undefined ? { height } : {})}
        />
      ),
  },

  createDraftItem: (source) =>
    createMediaDraftItem(source.id, {
      type: (source.mediaType as MediaItem["type"] | undefined) ?? "image",
      ...(source.defaultDuration !== undefined
        ? { defaultDuration: source.defaultDuration }
        : {}),
    }),

  signatureFields: (item) => item.mediaId ?? "",

  isSavable: (item) => item.type === "media" && Boolean(item.mediaId),

  toSavePayload: (item) => ({
    ...(item.serverId ? { id: item.serverId } : {}),
    type: "media",
    ...(item.mediaId ? { mediaId: item.mediaId } : {}),
    duration: item.duration,
    ...(item.disabled ? { disabled: true } : {}),
  }),
}

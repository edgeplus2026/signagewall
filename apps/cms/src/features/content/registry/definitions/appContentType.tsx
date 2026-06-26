import { AppWindowIcon } from "lucide-react"

import { useAllAppInstances } from "@/features/apps/hooks/useApps"
import type { AppInstance } from "@/features/apps/types/app.types"
import { createAppDraftItem } from "@/features/content/lib/contentDraft"
import type { ContentTypeDefinition } from "@/features/content/registry/contentType.types"

/**
 * App instances resolve from a single global query (like playlists), keyed by
 * instance id. Apps carry an editable per-item display duration (how long the
 * app stays on screen), so the duration input behaves like media.
 */
function useResolvedAppMap(keys: string[]): Map<string, AppInstance | null> {
  const { data: instances = [] } = useAllAppInstances()
  return new Map(
    keys.map((id) => [id, instances.find((instance) => instance.id === id) ?? null]),
  )
}

export const appContentType: ContentTypeDefinition<AppInstance> = {
  id: "app",

  metadata: {
    collectKeys: (items) => [
      ...new Set(
        items
          .filter(
            (item): item is typeof item & { appInstanceId: string } =>
              item.type === "app" && Boolean(item.appInstanceId),
          )
          .map((item) => item.appInstanceId),
      ),
    ],
    useResolvedMap: useResolvedAppMap,
    getKey: (item) =>
      item.type === "app" ? (item.appInstanceId ?? null) : null,
  },

  capabilities: {
    showsDurationInput: true,
    canEditDuration: () => true,
  },

  card: {
    title: ({ meta, t }) => meta?.name ?? t("screens.content.unknownApp"),
    typeLabel: ({ t }) => t("screens.content.appType"),
    badgeClassName: () => "bg-sidebar text-secondary",
    Thumbnail: () => (
      <div className="bg-sidebar flex size-full items-center justify-center">
        <AppWindowIcon className="text-secondary size-10" />
      </div>
    ),
    LibraryDragOverlay: ({ meta }) => (
      <div className="text-primary flex items-center gap-2 text-sm">
        <AppWindowIcon className="text-secondary size-4" />
        {meta.name}
      </div>
    ),
  },

  createDraftItem: (source) => createAppDraftItem(source.id),

  signatureFields: (item) => item.appInstanceId ?? "",

  isSavable: (item) => item.type === "app" && Boolean(item.appInstanceId),

  toSavePayload: (item) => ({
    ...(item.serverId ? { id: item.serverId } : {}),
    type: "app",
    ...(item.appInstanceId ? { appInstanceId: item.appInstanceId } : {}),
    duration: item.duration,
    ...(item.disabled ? { disabled: true } : {}),
  }),
}

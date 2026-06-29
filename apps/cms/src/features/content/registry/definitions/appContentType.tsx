import { AppWindowIcon, PencilIcon } from "lucide-react"

import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { AppIcon } from "@/features/apps/components/AppIcon"
import { useAllAppInstances, useApps } from "@/features/apps/hooks/useApps"
import type { AppInstance, EdgeApp } from "@/features/apps/types/app.types"
import {
  AppLibraryDragOverlayRow,
  LibraryAppCardOverlay,
} from "@/features/content/components/LibraryCards"
import { createAppDraftItem } from "@/features/content/lib/contentDraft"
import type { ContentTypeDefinition } from "@/features/content/registry/contentType.types"

/** Instance plus its resolved catalog app, so the card can show the app icon. */
interface AppMeta {
  instance: AppInstance
  app: EdgeApp | undefined
}

/**
 * App instances resolve from a single global query (like playlists), keyed by
 * instance id, joined with the app catalog so the card renders the app's brand
 * icon. Apps carry an editable per-item display duration (how long the app
 * stays on screen), so the duration input behaves like media.
 */
function useResolvedAppMap(keys: string[]): Map<string, AppMeta | null> {
  const { data: instances = [] } = useAllAppInstances()
  const { data: catalog = [] } = useApps()
  return new Map(
    keys.map((id) => {
      const instance = instances.find((entry) => entry.id === id)
      if (!instance) return [id, null]
      return [
        id,
        { instance, app: catalog.find((entry) => entry.slug === instance.appSlug) },
      ]
    }),
  )
}

export const appContentType: ContentTypeDefinition<AppMeta> = {
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
    showsDurationInput: () => true,
    canEditDuration: () => true,
  },

  card: {
    title: ({ meta, t }) => meta?.instance.name ?? t("screens.content.unknownApp"),
    typeLabel: ({ t }) => t("screens.content.appType"),
    badgeClassName: () => "bg-sidebar text-secondary",
    Thumbnail: ({ meta }) =>
      meta?.app ? (
        <div className="bg-sidebar flex size-full items-center justify-center">
          <AppIcon
            iconSvg={meta.app.iconSvg}
            color={meta.app.color}
            className="size-14 rounded-2xl shadow-md"
          />
        </div>
      ) : (
        <div className="bg-sidebar flex size-full items-center justify-center">
          <AppWindowIcon className="text-secondary size-10" />
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
        <LibraryAppCardOverlay instance={meta.instance} app={meta.app} />
      ) : (
        <AppLibraryDragOverlayRow
          instance={meta.instance}
          app={meta.app}
          {...(width !== undefined ? { width } : {})}
          {...(height !== undefined ? { height } : {})}
        />
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

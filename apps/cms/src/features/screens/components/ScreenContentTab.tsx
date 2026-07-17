import {
  LayoutTemplateIcon,
  ListXIcon,
  MoreHorizontalIcon,
  Trash2Icon,
} from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ContentEditor,
  type ContentEditorLabels,
} from "@/features/content/components/ContentEditor"
import { useContentContainer } from "@/features/content/hooks/useContentContainer"
import {
  createAppDraftItem,
  createMediaDraftItem,
  createPlaylistDraftItem,
  isDraftDirty,
} from "@/features/content/lib/contentDraft"
import type { NormalizedSavedItem } from "@/features/content/registry"
import { MediaDetailSheet } from "@/features/media/components/MediaDetailSheet"
import type { MediaItem } from "@/features/media/types/media.types"
import { PlaylistManageSidebar } from "@/features/playlists/components/PlaylistManageSidebar"
import type { PlaylistSummary } from "@/features/playlists/types/playlist.types"
import { DeleteScreenDialog } from "@/features/screens/components/DeleteScreenDialog"
import {
  useReplaceScreenItems,
  useSetScreenLayout,
} from "@/features/screens/hooks/useScreens"
import {
  screenItemsToDraftItems,
  screenZoneToDraftItems,
} from "@/features/screens/lib/screenContentDraft"
import type {
  ReplaceScreenItemInput,
  Screen,
  ScreenLayout,
  ScreenZoneKey,
} from "@/features/screens/types/screen.types"
import { ApiError, getApiErrorMessage } from "@/lib/api-error"

interface ScreenContentTabProps {
  screen: Screen
}

const SCREEN_LAYOUTS: ScreenLayout[] = [
  "fullscreen",
  "main-sidebar",
  "main-ticker",
  "main-sidebar-ticker",
]

/** The regions a preset defines, in editing order (main first). */
function zonesForLayout(layout: ScreenLayout): Array<"main" | ScreenZoneKey> {
  switch (layout) {
    case "main-sidebar":
      return ["main", "sidebar"]
    case "main-ticker":
      return ["main", "ticker"]
    case "main-sidebar-ticker":
      return ["main", "sidebar", "ticker"]
    default:
      return ["main"]
  }
}

/** Narrow the registry's normalized entry to the screen API shape. */
function toReplaceScreenItem(item: NormalizedSavedItem): ReplaceScreenItemInput {
  if (item.type === "playlist") {
    return {
      ...(item.id ? { id: item.id } : {}),
      type: "playlist",
      ...(item.playlistId ? { playlistId: item.playlistId } : {}),
      ...(item.disabled ? { disabled: true } : {}),
    }
  }

  if (item.type === "app") {
    return {
      ...(item.id ? { id: item.id } : {}),
      type: "app",
      ...(item.appInstanceId ? { appInstanceId: item.appInstanceId } : {}),
      duration: item.duration,
      ...(item.disabled ? { disabled: true } : {}),
    }
  }

  return {
    ...(item.id ? { id: item.id } : {}),
    type: "media",
    ...(item.mediaId ? { mediaId: item.mediaId } : {}),
    duration: item.duration,
    ...(item.disabled ? { disabled: true } : {}),
  }
}

export function ScreenContentTab({ screen }: ScreenContentTabProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const replaceScreenItems = useReplaceScreenItems()
  const setScreenLayout = useSetScreenLayout()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [mediaToEdit, setMediaToEdit] = useState<MediaItem | null>(null)

  // Split-screen: which region is being edited. Falls back to main whenever the
  // chosen zone stops existing under the current preset.
  const [zoneChoice, setZoneChoice] = useState<"main" | ScreenZoneKey>("main")
  const layout = screen.layout ?? "fullscreen"
  const zones = zonesForLayout(layout)
  const zone = zones.includes(zoneChoice) ? zoneChoice : "main"

  const toBaseline = useCallback(
    (entity: Screen) => screenZoneToDraftItems(entity, zone),
    [zone],
  )

  const { baseline, draftItems, setDraftItems, buildSavePayload } =
    useContentContainer({
      entity: screen,
      // The zone is part of the identity: switching regions re-baselines the
      // draft to that region's items.
      entityKey: `${screen.id}:${screen.updatedAt}:${zone}`,
      toBaseline,
    })

  // Zone/layout switching is blocked while the draft is dirty — the container
  // deliberately preserves a dirty draft across baseline changes, so switching
  // mid-edit would carry one region's unsaved items into another.
  const dirty = isDraftDirty(draftItems, baseline)

  const labels = useMemo<ContentEditorLabels>(
    () => ({
      libraryTitle: t("screens.content.libraryTitle"),
      libraryDescription: t("screens.content.libraryDescription"),
      librarySearch: t("screens.content.librarySearch"),
      libraryBack: t("screens.content.libraryBack"),
      libraryEmpty: t("screens.content.libraryEmpty"),
      libraryEmptySearch: t("screens.content.libraryEmptySearch"),
      playlistsTab: t("screens.content.playlistsTab"),
      playlistsSearch: t("screens.content.playlistsSearch"),
      playlistsEmpty: t("screens.content.playlistsEmpty"),
      playlistsEmptySearch: t("screens.content.playlistsEmptySearch"),
      emptyTitle: t("screens.content.emptyTitle"),
      emptyDescription: t("screens.content.emptyDescription"),
      hintTitle: t("screens.content.hintTitle"),
      hintDescription: t("screens.content.hintDescription"),
      totalDuration: t("screens.content.totalDuration"),
      itemsLabel: t("screens.content.itemsLabel"),
      itemCount: "screens.content.itemCount",
      saveChanges: t("screens.content.saveChanges"),
      removeItem: t("screens.content.removeItem"),
      disableItem: t("screens.content.disableItem"),
      enableItem: t("screens.content.enableItem"),
      disabledBadge: t("screens.content.disabledBadge"),
      removeDropZone: t("screens.content.removeDropZone"),
      durationLabel: t("screens.content.durationLabel"),
      mediaUnavailable: t("screens.content.mediaUnavailable"),
      unknownMedia: t("screens.content.unknownMedia"),
      unknownPlaylist: t("screens.content.unknownPlaylist"),
      playlistType: t("screens.content.playlistType"),
    }),
    [t]
  )

  const handleSave = useCallback(async () => {
    try {
      const saved = await replaceScreenItems.mutateAsync({
        id: screen.id,
        payload: {
          expectedUpdatedAt: screen.updatedAt,
          items: buildSavePayload().map(toReplaceScreenItem),
          ...(zone !== "main" ? { zone } : {}),
        },
      })
      const savedItems =
        zone === "main"
          ? saved.items
          : (saved.zones?.find((entry) => entry.key === zone)?.items ?? [])
      setDraftItems(screenItemsToDraftItems(savedItems))
      toast.success(t("screens.content.saveSuccess"))
    } catch (error) {
      if (error instanceof ApiError && error.code === "CONFLICT") {
        toast.error(t("screens.content.conflict"))
        return
      }
      toast.error(getApiErrorMessage(error, t("screens.content.saveError")))
    }
  }, [buildSavePayload, replaceScreenItems, screen.id, screen.updatedAt, setDraftItems, t, zone])

  const handleSetLayout = useCallback(
    async (next: ScreenLayout) => {
      if (next === layout) {
        return
      }
      try {
        await setScreenLayout.mutateAsync({ id: screen.id, layout: next })
        // The edited region may not exist under the new preset; re-anchor.
        if (!zonesForLayout(next).includes(zone)) {
          setZoneChoice("main")
        }
        toast.success(t("screens.layout.saveSuccess"))
      } catch (error) {
        toast.error(getApiErrorMessage(error, t("screens.layout.saveError")))
      }
    },
    [layout, screen.id, setScreenLayout, t, zone],
  )

  const handleClearContent = useCallback(() => {
    setDraftItems([])
  }, [setDraftItems])

  const handleEditMedia = useCallback((item: MediaItem) => {
    setMediaToEdit(item)
  }, [])

  const handleAddMediaToContent = useCallback(
    (item: MediaItem) => {
      setDraftItems((current) => [...current, createMediaDraftItem(item.id, item)])
    },
    [setDraftItems],
  )

  const handleAddPlaylistToContent = useCallback(
    (playlist: PlaylistSummary) => {
      setDraftItems((current) => [...current, createPlaylistDraftItem(playlist.id)])
    },
    [setDraftItems],
  )

  const handleAddAppToContent = useCallback(
    (appInstanceId: string) => {
      setDraftItems((current) => [...current, createAppDraftItem(appInstanceId)])
    },
    [setDraftItems],
  )

  const sidebarLabels = useMemo(
    () => ({
      libraryTitle: labels.libraryTitle,
      libraryDescription: labels.libraryDescription,
      librarySearch: labels.librarySearch,
      libraryBack: labels.libraryBack,
      libraryEmpty: labels.libraryEmpty,
      libraryEmptySearch: labels.libraryEmptySearch,
      playlistsTab: labels.playlistsTab,
      playlistsSearch: labels.playlistsSearch,
      playlistsEmpty: labels.playlistsEmpty,
      playlistsEmptySearch: labels.playlistsEmptySearch,
    }),
    [labels],
  )

  const footerActions = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="size-9 shrink-0"
        >
          <MoreHorizontalIcon />
          <span className="sr-only">{t("common.actions")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-52">
        <DropdownMenuItem onClick={handleClearContent}>
          <ListXIcon />
          {t("screens.manage.actions.clearAllContent")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="danger"
          onClick={() => {
            setDeleteOpen(true)
          }}
        >
          <Trash2Icon />
          {t("screens.manage.actions.moveToTrash")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
          <div className="flex items-center gap-1">
            {zones.length > 1
              ? zones.map((key) => (
                  <Button
                    key={key}
                    type="button"
                    size="sm"
                    variant={zone === key ? "secondary" : "ghost"}
                    disabled={dirty && zone !== key}
                    title={
                      dirty && zone !== key
                        ? t("screens.zones.saveFirst")
                        : undefined
                    }
                    onClick={() => {
                      setZoneChoice(key)
                    }}
                  >
                    {t(`screens.zones.${key}`)}
                  </Button>
                ))
              : null}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={dirty || setScreenLayout.isPending}
                title={dirty ? t("screens.zones.saveFirst") : undefined}
              >
                <LayoutTemplateIcon />
                {t(`screens.layout.${layout}`)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-auto min-w-52">
              {SCREEN_LAYOUTS.map((preset) => (
                <DropdownMenuItem
                  key={preset}
                  onClick={() => {
                    void handleSetLayout(preset)
                  }}
                >
                  {t(`screens.layout.${preset}`)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="min-h-0 flex-1">
          <ContentEditor
            draftItems={draftItems}
            baseline={baseline}
            onDraftItemsChange={setDraftItems}
            onSave={handleSave}
            isSaving={replaceScreenItems.isPending}
            labels={labels}
            footerActions={footerActions}
            onContentMediaUpdate={handleEditMedia}
            sidebar={
              <PlaylistManageSidebar
                allowedTypes={["media", "playlist", "app"]}
                labels={sidebarLabels}
                onAddToContent={handleAddMediaToContent}
                onAddPlaylistToContent={handleAddPlaylistToContent}
                onAddApp={handleAddAppToContent}
                onEditMedia={handleEditMedia}
                onUpdatePlaylist={(playlistId) => {
                  void navigate(`/playlists/${playlistId}`)
                }}
              />
            }
          />
        </div>
      </div>

      <DeleteScreenDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        screenIds={[screen.id]}
        onSuccess={() => {
          void navigate("/screens")
        }}
      />

      <MediaDetailSheet
        open={mediaToEdit !== null}
        onOpenChange={(open) => {
          if (!open) setMediaToEdit(null)
        }}
        item={mediaToEdit}
      />

    </>
  )
}

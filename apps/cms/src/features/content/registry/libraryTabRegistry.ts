import type { ComponentType } from "react"

import type { ContentItemType } from "@/features/content/types/contentDraft.types"
import type { MediaItem } from "@/features/media/types/media.types"
import type { PlaylistSummary } from "@/features/playlists/types/playlist.types"

/** Labels a library tab panel may consume (superset; each panel reads a subset). */
export interface LibraryTabLabels {
  librarySearch: string
  /** Apps-tab search placeholder; only provided by the screen content editor. */
  appsSearch?: string | undefined
  libraryBack: string
  libraryEmpty: string
  libraryEmptySearch: string
  playlistsSearch: string
  playlistsEmpty: string
  playlistsEmptySearch: string
}

/** Props every library tab panel receives from the sidebar. */
export interface LibraryTabPanelProps {
  labels: LibraryTabLabels
  onAddMedia: (item: MediaItem) => void
  onEditMedia: (item: MediaItem) => void
  onAddPlaylist?: ((playlist: PlaylistSummary) => void) | undefined
  onUpdatePlaylist?: ((playlistId: string) => void) | undefined
  onAddApp?: ((appInstanceId: string) => void) | undefined
}

export interface LibraryTabDefinition {
  /** Matches the content type id this tab adds to the canvas. */
  id: ContentItemType
  /** i18n key for the tab trigger label. */
  triggerLabelKey: string
  Panel: ComponentType<LibraryTabPanelProps>
}

const tabs: LibraryTabDefinition[] = []
const tabsById = new Map<ContentItemType, LibraryTabDefinition>()

export function registerLibraryTab(tab: LibraryTabDefinition): void {
  if (tabsById.has(tab.id)) {
    const index = tabs.findIndex((entry) => entry.id === tab.id)
    if (index !== -1) tabs[index] = tab
  } else {
    tabs.push(tab)
  }
  tabsById.set(tab.id, tab)
}

/** Tabs for the given allowed types, in registration order. */
export function listLibraryTabs(
  allowedTypes: ContentItemType[],
): LibraryTabDefinition[] {
  return tabs.filter((tab) => allowedTypes.includes(tab.id))
}

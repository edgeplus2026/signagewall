import { useTranslation } from "react-i18next"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  listLibraryTabs,
  type LibraryTabLabels,
} from "@/features/content/registry"
import type { ContentItemType } from "@/features/content/types/contentDraft.types"
import type { MediaItem } from "@/features/media/types/media.types"
import type { PlaylistSummary } from "@/features/playlists/types/playlist.types"

interface PlaylistManageSidebarLabels extends LibraryTabLabels {
  libraryTitle: string
  libraryDescription: string
  playlistsTab?: string
}

interface PlaylistManageSidebarProps {
  onAddToContent: (item: MediaItem) => void
  onEditMedia: (item: MediaItem) => void
  /** Content types this sidebar offers (defaults to media only). */
  allowedTypes?: ContentItemType[]
  onAddPlaylistToContent?: (playlist: PlaylistSummary) => void
  onUpdatePlaylist?: (playlistId: string) => void
  labels?: Partial<PlaylistManageSidebarLabels>
}

export function PlaylistManageSidebar({
  onAddToContent,
  onEditMedia,
  allowedTypes = ["media"],
  onAddPlaylistToContent,
  onUpdatePlaylist,
  labels,
}: PlaylistManageSidebarProps) {
  const { t } = useTranslation()

  const tabLabels: LibraryTabLabels = {
    librarySearch: labels?.librarySearch ?? t("playlists.content.librarySearch"),
    libraryBack: labels?.libraryBack ?? t("playlists.content.libraryBack"),
    libraryEmpty: labels?.libraryEmpty ?? t("playlists.content.libraryEmpty"),
    libraryEmptySearch:
      labels?.libraryEmptySearch ?? t("playlists.content.libraryEmptySearch"),
    playlistsSearch: labels?.playlistsSearch ?? t("screens.content.playlistsSearch"),
    playlistsEmpty: labels?.playlistsEmpty ?? t("screens.content.playlistsEmpty"),
    playlistsEmptySearch:
      labels?.playlistsEmptySearch ?? t("screens.content.playlistsEmptySearch"),
  }

  const libraryTitle = labels?.libraryTitle ?? t("playlists.content.libraryTitle")
  const libraryDescription =
    labels?.libraryDescription ?? t("playlists.content.libraryDescription")

  const tabs = listLibraryTabs(allowedTypes)

  const panelProps = {
    labels: tabLabels,
    onAddMedia: onAddToContent,
    onEditMedia,
    onAddPlaylist: onAddPlaylistToContent,
    onUpdatePlaylist,
  }

  const SingleTabPanel = tabs.length === 1 ? tabs[0]?.Panel : null

  return (
    <aside className="flex min-h-0 w-full shrink-0 flex-col lg:w-72">
      <div className="border-secondary bg-panel flex min-h-0 flex-1 flex-col gap-3 rounded-xl border p-3 lg:max-h-none">
        <div className="min-w-0">
          <h3 className="text-primary text-base font-medium">{libraryTitle}</h3>
          <p className="text-secondary text-xs leading-snug">{libraryDescription}</p>
        </div>

        {SingleTabPanel ? (
          <SingleTabPanel {...panelProps} />
        ) : (
          <Tabs
            defaultValue={tabs[0]?.id ?? "media"}
            className="flex min-h-0 flex-1 flex-col gap-3"
          >
            <TabsList variant="line" className="w-full shrink-0">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id} className="flex-1">
                  {tab.id === "playlist" && labels?.playlistsTab
                    ? labels.playlistsTab
                    : t(tab.triggerLabelKey)}
                </TabsTrigger>
              ))}
            </TabsList>
            {tabs.map((tab) => {
              const TabPanel = tab.Panel
              return (
                <TabsContent
                  key={tab.id}
                  value={tab.id}
                  className="mt-0 flex min-h-0 flex-1 flex-col gap-3 data-[state=inactive]:hidden"
                >
                  <TabPanel {...panelProps} />
                </TabsContent>
              )
            })}
          </Tabs>
        )}
      </div>
    </aside>
  )
}

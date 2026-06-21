import { useTranslation } from "react-i18next"
import { Navigate, useParams, useSearchParams } from "react-router-dom"

import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlaylistBreadcrumb } from "@/features/playlists/components/PlaylistBreadcrumb"
import { PlaylistManageTab } from "@/features/playlists/components/PlaylistManageTab"
import { PlaylistSettingsTab } from "@/features/playlists/components/PlaylistSettingsTab"
import { usePlaylist } from "@/features/playlists/hooks/usePlaylists"
import type { PlaylistDetailTab } from "@/features/playlists/types/playlist.types"
import { cn } from "@/lib/utils"

function getActiveTab(tab: string | null): PlaylistDetailTab {
  return tab === "settings" ? "settings" : "content"
}

export default function PlaylistPage() {
  const { t } = useTranslation()
  const { playlistId } = useParams<{ playlistId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = getActiveTab(searchParams.get("tab"))
  const { data: playlist, isLoading } = usePlaylist(playlistId ?? null)
  const isContentTab = activeTab === "content"

  if (!playlistId) {
    return <Navigate to="/playlists" replace />
  }

  const breadcrumbName = isLoading
    ? undefined
    : playlist?.name ?? t("playlists.manage.notFound")

  if (isLoading) {
    return (
      <>
        <PlaylistBreadcrumb />
        <div className="flex w-full min-w-0 flex-col gap-6 lg:px-10">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="min-h-96 w-full rounded-xl" />
        </div>
      </>
    )
  }

  if (!playlist) {
    return (
      <>
        <PlaylistBreadcrumb playlistName={breadcrumbName} />
        <div className="flex w-full min-w-0 flex-col gap-4 lg:px-10">
          <p className="text-secondary text-sm">{t("playlists.manage.notFound")}</p>
        </div>
      </>
    )
  }

  return (
    <>
      <PlaylistBreadcrumb playlistName={breadcrumbName} />
      <div
        className={cn(
          "flex w-full min-w-0 flex-col gap-4 lg:px-10",
          isContentTab ? "h-[calc(100dvh-5.5rem)]" : "pb-6"
        )}
      >
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            const nextTab = value as PlaylistDetailTab
            if (nextTab === "settings") {
              setSearchParams({ tab: "settings" })
            } else {
              setSearchParams({})
            }
          }}
          className={cn(
            "flex min-h-0 flex-1 flex-col gap-4",
            isContentTab && "overflow-hidden"
          )}
        >
          <TabsList variant="line" className="w-fit shrink-0">
            <TabsTrigger value="content">{t("playlists.manage.tabs.content")}</TabsTrigger>
            <TabsTrigger value="settings">{t("playlists.manage.tabs.settings")}</TabsTrigger>
          </TabsList>

          <div
            className={cn(
              "min-h-0 flex-1",
              isContentTab
                ? "flex flex-col overflow-hidden"
                : "visible-scrollbar overflow-y-auto"
            )}
          >
            <TabsContent
              value="content"
              className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
            >
              <PlaylistManageTab
                key={playlist.id}
                playlist={playlist}
              />
            </TabsContent>

            <TabsContent value="settings" className="mt-0">
              <PlaylistSettingsTab playlist={playlist} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </>
  )
}

import { useAllMediaFiles } from "@/features/media/hooks/useMedia"
import { usePlaylists } from "@/features/playlists/hooks/usePlaylists"
import { useScreens } from "@/features/screens/hooks/useScreens"

export function useDashboardStats() {
  const { data: playlists = [] } = usePlaylists()
  const { data: screens = [] } = useScreens()
  const { data: mediaFiles = [] } = useAllMediaFiles()

  return {
    playlistCount: playlists.length,
    mediaFileCount: mediaFiles.length,
    screenCount: screens.length,
  }
}

import { registerContentType } from "./contentTypeRegistry"
import { appContentType } from "./definitions/appContentType"
import { AppLibraryPanel } from "./definitions/appLibraryTab"
import { mediaContentType } from "./definitions/mediaContentType"
import { MediaLibraryPanel } from "./definitions/mediaLibraryTab"
import { playlistContentType } from "./definitions/playlistContentType"
import { PlaylistLibraryPanel } from "./definitions/playlistLibraryTab"
import { registerLibraryTab } from "./libraryTabRegistry"

// Register all built-in content types and their library tabs. Importing this
// module is the single place that wires definitions into the registries;
// consumers import their lookups from here so registration has run.
registerContentType(mediaContentType)
registerContentType(playlistContentType)
registerContentType(appContentType)

registerLibraryTab({
  id: "media",
  triggerLabelKey: "media.title",
  Panel: MediaLibraryPanel,
})
registerLibraryTab({
  id: "playlist",
  triggerLabelKey: "screens.content.playlistsTab",
  Panel: PlaylistLibraryPanel,
})
registerLibraryTab({
  id: "app",
  triggerLabelKey: "screens.content.appsTab",
  Panel: AppLibraryPanel,
})

export {
  getContentTypeDefinition,
  listContentTypes,
  registerContentType,
} from "./contentTypeRegistry"
export {
  listLibraryTabs,
  registerLibraryTab,
} from "./libraryTabRegistry"
export type {
  LibraryTabDefinition,
  LibraryTabLabels,
  LibraryTabPanelProps,
} from "./libraryTabRegistry"
export type {
  ContentTypeDefinition,
  ContentCardLabels,
  ContentCardContext,
  ContentCardMenuContext,
  NormalizedSavedItem,
} from "./contentType.types"

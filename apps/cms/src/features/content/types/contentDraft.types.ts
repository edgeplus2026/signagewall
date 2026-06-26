export type ContentItemType = "media" | "playlist" | "app"

export interface ContentDraftItem {
  clientId: string
  type: ContentItemType
  mediaId?: string
  playlistId?: string
  appInstanceId?: string
  duration: number
  serverId?: string
  disabled?: boolean
}

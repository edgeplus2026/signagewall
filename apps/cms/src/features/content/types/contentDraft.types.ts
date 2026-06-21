export type ContentItemType = "media" | "playlist"

export interface ContentDraftItem {
  clientId: string
  type: ContentItemType
  mediaId?: string
  playlistId?: string
  duration: number
  serverId?: string
  disabled?: boolean
}

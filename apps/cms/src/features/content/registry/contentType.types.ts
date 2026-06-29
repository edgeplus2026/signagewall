import type { ReactNode } from "react"

import type {
  ContentDraftItem,
  ContentItemType,
} from "@/features/content/types/contentDraft.types"

/**
 * Labels passed to a content type's card render functions. This is the subset
 * of `ContentEditorLabels` the cards actually consume (see `ContentEditor`'s
 * `cardLabels` memo).
 */
export interface ContentCardLabels {
  removeItem: string
  disableItem: string
  enableItem: string
  disabledBadge: string
  mediaUnavailable: string
  unknownMedia: string
  unknownPlaylist: string
  durationLabel: string
  playlistType: string
  preview?: string
  update?: string
  updatePlaylist?: string
}

/**
 * Translate function the cards call. Kept structurally loose so `react-i18next`'s
 * overloaded `TFunction` is assignable to it. Card definitions only ever call it
 * as `t(key)` or `t(key, { count })`.
 */
export type TranslateFn = (key: string, options?: Record<string, unknown>) => string

/** Context handed to a content type's pure card render functions. */
export interface ContentCardContext<TMeta> {
  item: ContentDraftItem
  meta: TMeta | null
  labels: ContentCardLabels
  t: TranslateFn
}

/** Callbacks a card may expose; the definition decides which menu items to show. */
export interface ContentCardMenuContext<TMeta> extends ContentCardContext<TMeta> {
  /** Edit/open action for this item, receiving the resolved metadata. */
  onUpdate?: ((meta: TMeta) => void) | undefined
}

/**
 * Resolves the domain object ("metadata") behind a draft item of this type.
 *
 * The two existing types resolve metadata in fundamentally different ways:
 * media fetches each id individually (`useQueries`), playlists come from a
 * single global query. `useResolvedMap` is therefore a hook owned by the
 * definition. `useContentMetadata` calls it for every registered type in a
 * stable, registration order so the hook count never changes between renders.
 */
export interface ContentMetadataResolver<TMeta> {
  /** Unique resolution keys present in the draft (e.g. mediaIds / playlistIds). */
  collectKeys: (items: ContentDraftItem[]) => string[]
  /** Hook returning a `key -> meta` map. Must obey rules-of-hooks. */
  useResolvedMap: (keys: string[]) => Map<string, TMeta | null>
  /** This item's resolution key, or null when absent. */
  getKey: (item: ContentDraftItem) => string | null
}

export interface ContentTypeCardRenderers<TMeta> {
  title: (ctx: ContentCardContext<TMeta>) => string
  typeLabel: (ctx: ContentCardContext<TMeta>) => string
  /** Tailwind classes for the type badge pill. */
  badgeClassName: (ctx: ContentCardContext<TMeta>) => string
  Thumbnail: (props: {
    item: ContentDraftItem
    meta: TMeta | null
    labels: ContentCardLabels
  }) => ReactNode
  /** Type-unique dropdown menu entries (edit media, open playlist, …). */
  MenuItems?: (props: ContentCardMenuContext<TMeta>) => ReactNode
  /** Overlay row shown while dragging an item of this type in from the library. */
  LibraryDragOverlay: (props: {
    meta: TMeta
    isCustomSidebar: boolean
    width?: number
    height?: number
  }) => ReactNode
}

export interface ContentTypeCapabilities<TMeta> {
  /**
   * Whether the per-item duration input is rendered at all, given the resolved
   * meta (images/apps: yes; videos have an intrinsic duration, so: no).
   */
  showsDurationInput: (item: ContentDraftItem, meta: TMeta | null) => boolean
  /** Whether the duration value is editable given the resolved meta (image only). */
  canEditDuration: (item: ContentDraftItem, meta: TMeta | null) => boolean
}

/** Source describing a library item being added (drag drop or add button). */
export interface ContentDraftSource {
  id: string
  mediaType?: string
  defaultDuration?: number
}

/**
 * Container-agnostic, normalized save entry. Each container's mapper narrows
 * this to its API request shape (playlists drop `type`, screens keep it).
 */
export interface NormalizedSavedItem {
  id?: string
  type: ContentItemType
  mediaId?: string
  playlistId?: string
  appInstanceId?: string
  duration: number
  disabled?: boolean
}

/**
 * Everything a single content type contributes to the editor. Adding a new
 * type means authoring one of these and registering it — no edits to the
 * editor, card, drag hook, or container.
 */
export interface ContentTypeDefinition<TMeta = unknown> {
  id: ContentItemType

  metadata: ContentMetadataResolver<TMeta>
  card: ContentTypeCardRenderers<TMeta>
  capabilities: ContentTypeCapabilities<TMeta>

  /** Build a draft item from a library source. */
  createDraftItem: (source: ContentDraftSource) => ContentDraftItem
  /** This type's contribution to the dirty-check signature. */
  signatureFields: (item: ContentDraftItem) => string
  /** Whether a draft item has its required id and should be persisted. */
  isSavable: (item: ContentDraftItem) => boolean
  /** Map a draft item to the normalized save entry. */
  toSavePayload: (item: ContentDraftItem) => NormalizedSavedItem
}

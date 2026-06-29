import {
  closestCenter,
  pointerWithin,
  type CollisionDetection,
} from "@dnd-kit/core"

/** Droppable id for the content grid container (empty-list / append fallback). */
export const CONTENT_CANVAS_ID = "content-canvas"

/** Droppable id for the "drag here to remove" zone shown while reordering. */
export const CONTENT_REMOVE_ID = "content-remove"

/**
 * Droppable id for the whole editor section. Acts as the outer drop boundary:
 * a library item dropped anywhere inside it is added, dropped outside it
 * (e.g. over the sidebar) is rejected.
 */
export const CONTENT_SECTION_ID = "content-section"

/** Sortable id of the live placeholder shown while dragging a library item in. */
export const PLACEHOLDER_ID = "__content-placeholder__"

// App's prefix is checked before media's: media's "library-" is itself a prefix
// of "library-app-"/"library-playlist-", so the more specific ones must win.
const MEDIA_DRAG_PREFIX = "library-"
const PLAYLIST_DRAG_PREFIX = "library-playlist-"
const APP_DRAG_PREFIX = "library-app-"

export function mediaLibraryDragId(mediaId: string) {
  return `${MEDIA_DRAG_PREFIX}${mediaId}`
}

export function playlistLibraryDragId(playlistId: string) {
  return `${PLAYLIST_DRAG_PREFIX}${playlistId}`
}

export function appLibraryDragId(appInstanceId: string) {
  return `${APP_DRAG_PREFIX}${appInstanceId}`
}

export type LibraryDragSource =
  | { type: "media"; mediaId: string }
  | { type: "playlist"; playlistId: string }
  | { type: "app"; appInstanceId: string }

export function parseLibraryDragId(id: string): LibraryDragSource | null {
  if (id.startsWith(APP_DRAG_PREFIX)) {
    return { type: "app", appInstanceId: id.slice(APP_DRAG_PREFIX.length) }
  }
  if (id.startsWith(PLAYLIST_DRAG_PREFIX)) {
    return { type: "playlist", playlistId: id.slice(PLAYLIST_DRAG_PREFIX.length) }
  }
  if (id.startsWith(MEDIA_DRAG_PREFIX)) {
    return { type: "media", mediaId: id.slice(MEDIA_DRAG_PREFIX.length) }
  }
  return null
}

/**
 * Collision detection for the content grid.
 *
 * Reordering and library inserts need different behaviour:
 *
 * - **Reorder** uses plain `closestCenter` against the cards, so siblings shift
 *   smoothly and the active card always has a target. Gating this on
 *   `pointerWithin` would flip the target to the container whenever the pointer
 *   crossed the gaps between cards, making the row flicker.
 * - **Library** drags gate on `pointerWithin`: when the pointer is over empty
 *   space the container (`CONTENT_CANVAS_ID`) wins so the item appends to the
 *   end instead of snapping between cards (a card's center always "wins" while
 *   any card exists, even far below the row).
 */
export const contentCollisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args)

  // The remove zone wins whenever the pointer is over it, for any drag kind.
  const removeCollision = pointerCollisions.find(
    (collision) => collision.id === CONTENT_REMOVE_ID,
  )
  if (removeCollision) return [removeCollision]

  const isContainer = (id: string | number) =>
    id === CONTENT_CANVAS_ID || id === CONTENT_REMOVE_ID

  const cardContainers = args.droppableContainers.filter(
    (container) => !isContainer(container.id),
  )

  const isLibraryDrag = parseLibraryDragId(String(args.active.id)) !== null

  if (!isLibraryDrag) {
    const cardCollisions = closestCenter({
      ...args,
      droppableContainers: cardContainers,
    })
    return cardCollisions.length > 0 ? cardCollisions : pointerCollisions
  }

  const isOverCard = pointerCollisions.some(
    (collision) => !isContainer(collision.id),
  )
  if (isOverCard) {
    return closestCenter({ ...args, droppableContainers: cardContainers })
  }

  const canvasCollision = pointerCollisions.find(
    (collision) => collision.id === CONTENT_CANVAS_ID,
  )
  return canvasCollision ? [canvasCollision] : pointerCollisions
}

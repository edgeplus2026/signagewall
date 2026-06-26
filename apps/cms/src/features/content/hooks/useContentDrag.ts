import {
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  CONTENT_CANVAS_ID,
  CONTENT_REMOVE_ID,
  CONTENT_SECTION_ID,
  PLACEHOLDER_ID,
  contentCollisionDetection,
  parseLibraryDragId,
  type LibraryDragSource,
} from "@/features/content/lib/contentDnd"
import { insertDraftItemAt } from "@/features/content/lib/contentDraft"
import { getContentTypeDefinition } from "@/features/content/registry/contentTypeRegistry"
import type { ContentDraftItem } from "@/features/content/types/contentDraft.types"
import type { MediaItem } from "@/features/media/types/media.types"

/** Sentinel rendered as the live insertion gap while dragging a library item in. */
export const PLACEHOLDER_ITEM: ContentDraftItem = {
  clientId: PLACEHOLDER_ID,
  type: "media",
  duration: 0,
}

/** Whether the given pointer point falls within the editor section's DOM rect. */
function isPointInsideSection(
  point: { x: number; y: number } | null,
  fallbackHasDroppable: boolean,
): boolean {
  const section =
    typeof document !== "undefined"
      ? document.getElementById(CONTENT_SECTION_ID)
      : null

  // If we can't resolve either, fall back to whether a droppable was hit.
  if (!section || !point) return fallbackHasDroppable

  const rect = section.getBoundingClientRect()
  return (
    point.x >= rect.left &&
    point.x <= rect.right &&
    point.y >= rect.top &&
    point.y <= rect.bottom
  )
}

type ActiveDrag =
  | { kind: "reorder"; clientId: string }
  | {
      kind: "library"
      source: LibraryDragSource
      mediaType?: MediaItem["type"]
      defaultDuration?: number
    }

interface LibraryDragData {
  mediaType?: MediaItem["type"]
  defaultDuration?: number
}

interface UseContentDragOptions {
  draftItems: ContentDraftItem[]
  onItemsChange: (items: ContentDraftItem[]) => void
}

export function useContentDrag({
  draftItems,
  onItemsChange,
}: UseContentDragOptions) {
  const draftItemsRef = useRef(draftItems)
  useEffect(() => {
    draftItemsRef.current = draftItems
  }, [draftItems])

  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null)
  const [previewItems, setPreviewItems] = useState<ContentDraftItem[]>([])
  const [dragOverlaySize, setDragOverlaySize] = useState<{
    width: number
    height: number
  } | null>(null)

  const activeDragRef = useRef<ActiveDrag | null>(null)
  const previewItemsRef = useRef<ContentDraftItem[]>([])

  // Live pointer position, tracked from native events. dnd-kit's drag end only
  // exposes the activation point plus pointer delta, which drifts whenever the
  // source list auto-scrolls during a drag (the scroll offset isn't part of the
  // delta), so reconstructing the drop point from it rejects valid drops of
  // items that had to be scrolled into view. The real cursor position does not
  // have that problem.
  const pointerRef = useRef<{ x: number; y: number } | null>(null)
  useEffect(() => {
    if (typeof window === "undefined") return

    const trackMouse = (event: MouseEvent) => {
      pointerRef.current = { x: event.clientX, y: event.clientY }
    }
    const trackTouch = (event: TouchEvent) => {
      const touch = event.touches[0] ?? event.changedTouches[0]
      if (touch) pointerRef.current = { x: touch.clientX, y: touch.clientY }
    }

    window.addEventListener("mousemove", trackMouse, { passive: true })
    window.addEventListener("touchmove", trackTouch, { passive: true })
    return () => {
      window.removeEventListener("mousemove", trackMouse)
      window.removeEventListener("touchmove", trackTouch)
    }
  }, [])

  const setPreview = useCallback((next: ContentDraftItem[]) => {
    previewItemsRef.current = next
    setPreviewItems(next)
  }, [])

  const setActive = useCallback((next: ActiveDrag | null) => {
    activeDragRef.current = next
    setActiveDrag(next)
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    })
  )

  const clearDragState = useCallback(() => {
    setActive(null)
    setPreview([])
    setDragOverlaySize(null)
  }, [setActive, setPreview])

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const activeId = String(event.active.id)

      const rect = event.active.rect.current.initial
      setDragOverlaySize(rect ? { width: rect.width, height: rect.height } : null)

      const library = parseLibraryDragId(activeId)
      if (library) {
        const data = event.active.data.current as LibraryDragData | undefined
        setActive({
          kind: "library",
          source: library,
          ...(data?.mediaType ? { mediaType: data.mediaType } : {}),
          ...(data?.defaultDuration !== undefined
            ? { defaultDuration: data.defaultDuration }
            : {}),
        })
        // Placeholder starts at the end; the first dragOver repositions it.
        setPreview([...draftItemsRef.current, PLACEHOLDER_ITEM])
        return
      }

      setActive({ kind: "reorder", clientId: activeId })
      setPreview([])
    },
    [setActive, setPreview]
  )

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      // Only library drags reposition the placeholder; reordering is handled
      // live by SortableContext.
      const current = previewItemsRef.current
      const fromIndex = current.findIndex(
        (item) => item.clientId === PLACEHOLDER_ID
      )
      if (fromIndex === -1) return

      const overId = event.over ? String(event.over.id) : null
      if (!overId || overId === PLACEHOLDER_ID) return

      const toIndex =
        overId === CONTENT_CANVAS_ID
          ? current.length - 1
          : current.findIndex((item) => item.clientId === overId)

      if (toIndex === -1 || toIndex === fromIndex) return

      setPreview(arrayMove(current, fromIndex, toIndex))
    },
    [setPreview]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const drag = activeDragRef.current
      const preview = previewItemsRef.current
      const baseItems = draftItemsRef.current

      clearDragState()

      if (!drag) return

      if (drag.kind === "reorder") {
        const overId = event.over ? String(event.over.id) : null
        if (!overId) return

        if (overId === CONTENT_REMOVE_ID) {
          onItemsChange(
            baseItems.filter((item) => item.clientId !== drag.clientId)
          )
          return
        }

        const oldIndex = baseItems.findIndex(
          (item) => item.clientId === drag.clientId
        )
        const newIndex =
          overId === CONTENT_CANVAS_ID
            ? baseItems.length - 1
            : baseItems.findIndex((item) => item.clientId === overId)

        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

        onItemsChange(arrayMove(baseItems, oldIndex, newIndex))
        return
      }

      // Reject only when the pointer is released outside the editor section
      // (e.g. over the sidebar). Checked against the real DOM rect so drops in
      // empty grid space and the footer — anywhere inside the section — are kept.
      if (!isPointInsideSection(pointerRef.current, event.over !== null)) return

      // The placeholder is the source of truth: a library item lands where the
      // placeholder is shown, defaulting to the end for empty-space drops.
      const placeholderIndex = preview.findIndex(
        (item) => item.clientId === PLACEHOLDER_ID
      )
      const insertIndex =
        placeholderIndex === -1 ? baseItems.length : placeholderIndex

      const sourceId =
        drag.source.type === "media" ? drag.source.mediaId : drag.source.playlistId
      const newItem = getContentTypeDefinition(drag.source.type).createDraftItem({
        id: sourceId,
        ...(drag.mediaType ? { mediaType: drag.mediaType } : {}),
        ...(drag.defaultDuration !== undefined
          ? { defaultDuration: drag.defaultDuration }
          : {}),
      })

      onItemsChange(insertDraftItemAt(baseItems, newItem, insertIndex))
    },
    [clearDragState, onItemsChange]
  )

  const isLibraryDrag = activeDrag?.kind === "library"

  const renderItems = isLibraryDrag ? previewItems : draftItems
  const sortableIds = useMemo(
    () => renderItems.map((item) => item.clientId),
    [renderItems]
  )

  const activeLibraryDrag = isLibraryDrag ? activeDrag.source : null
  const activeReorderId =
    activeDrag?.kind === "reorder" ? activeDrag.clientId : null

  return {
    sensors,
    collisionDetection: contentCollisionDetection,
    renderItems,
    sortableIds,
    isLibraryDrag,
    activeLibraryDrag,
    activeReorderId,
    dragOverlaySize,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel: clearDragState,
  }
}

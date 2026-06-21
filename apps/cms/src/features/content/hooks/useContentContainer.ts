import { useCallback, useEffect, useMemo, useState } from "react"

import { isDraftDirty } from "@/features/content/lib/contentDraft"
import type { NormalizedSavedItem } from "@/features/content/registry/contentType.types"
import { getContentTypeDefinition } from "@/features/content/registry/contentTypeRegistry"
import type {
  ContentDraftItem,
  ContentItemType,
} from "@/features/content/types/contentDraft.types"

interface UseContentContainerOptions<TEntity> {
  /** The container entity (playlist/screen) whose items seed the baseline. */
  entity: TEntity
  /** Identity used to detect when a fresh baseline should reset the draft. */
  entityKey: unknown
  /** Build the baseline draft items from the entity. */
  toBaseline: (entity: TEntity) => ContentDraftItem[]
}

/**
 * Shared draft/baseline/dirty/save plumbing for any content container
 * (playlists, screens, future types). Replaces the byte-identical state blocks
 * the two tabs duplicated and centralizes the registry-driven save mapping.
 */
export function useContentContainer<TEntity>({
  entity,
  entityKey,
  toBaseline,
}: UseContentContainerOptions<TEntity>) {
  const baseline = useMemo(
    () => toBaseline(entity),
    // toBaseline is stable; entityKey captures the meaningful identity (id +
    // updatedAt + items) so the baseline only rebuilds when the entity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityKey],
  )

  const [draftItems, setDraftItems] = useState<ContentDraftItem[]>(baseline)

  // Adopt a fresh baseline only when the local draft is not dirty, so unsaved
  // edits survive background refetches. Synchronizing draft state to an external
  // source (the refetched entity) is exactly what this effect is for.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing local draft to refetched server state; guarded to preserve unsaved edits
    setDraftItems((current) => (isDraftDirty(current, baseline) ? current : baseline))
  }, [baseline])

  /**
   * Normalized, registry-mapped save entries for the allowed types. Each
   * container narrows these to its own API request shape.
   */
  const buildSavePayload = useCallback(
    (allowedTypes?: ContentItemType[]): NormalizedSavedItem[] =>
      draftItems
        .filter((item) => {
          if (allowedTypes && !allowedTypes.includes(item.type)) return false
          return getContentTypeDefinition(item.type).isSavable(item)
        })
        .map((item) => getContentTypeDefinition(item.type).toSavePayload(item)),
    [draftItems],
  )

  return {
    baseline,
    draftItems,
    setDraftItems,
    buildSavePayload,
  }
}

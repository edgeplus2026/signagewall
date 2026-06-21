import { listContentTypes } from "@/features/content/registry/contentTypeRegistry"
import type { ContentDraftItem } from "@/features/content/types/contentDraft.types"

/**
 * Resolves the domain object ("metadata") behind every draft item via the
 * content-type registry, replacing the editor's hardcoded media/playlist memos.
 *
 * Each registered type owns how its metadata is fetched (media: per-id queries,
 * playlist: a single global query). We iterate the registry in its fixed
 * registration order and call every definition's `useResolvedMap` hook, so the
 * hook count and order never change between renders.
 */
export function useContentMetadata(draftItems: ContentDraftItem[]) {
  const definitions = listContentTypes()

  // One resolved map per registered type. The registry order is stable, so this
  // loop calls the same hooks in the same order on every render.
  const resolvedMaps = definitions.map((definition) => {
    const keys = definition.metadata.collectKeys(draftItems)
    return definition.metadata.useResolvedMap(keys)
  })

  // Flatten into a single clientId -> meta map. Recomputed each render (cheap,
  // and the resolved maps change identity per render anyway).
  const metaByClientId = new Map<string, unknown>()
  for (const item of draftItems) {
    const index = definitions.findIndex((entry) => entry.id === item.type)
    const definition = index === -1 ? undefined : definitions[index]
    const resolved = index === -1 ? undefined : resolvedMaps[index]
    if (!definition || !resolved) continue
    const key = definition.metadata.getKey(item)
    metaByClientId.set(item.clientId, key ? (resolved.get(key) ?? null) : null)
  }

  const resolveMeta = (item: ContentDraftItem): unknown =>
    metaByClientId.get(item.clientId) ?? null

  return { resolveMeta }
}

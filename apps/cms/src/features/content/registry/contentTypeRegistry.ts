import type { ContentTypeDefinition } from "./contentType.types"

import type { ContentItemType } from "@/features/content/types/contentDraft.types"


/**
 * Registration-ordered list of content type definitions. Order is stable so
 * `useContentMetadata` can iterate it to call each definition's metadata hook
 * in a fixed order (rules-of-hooks).
 */
const definitions: ContentTypeDefinition[] = []
const definitionsById = new Map<ContentItemType, ContentTypeDefinition>()

export function registerContentType<TMeta>(
  definition: ContentTypeDefinition<TMeta>,
): void {
  const erased = definition as ContentTypeDefinition
  if (definitionsById.has(definition.id)) {
    // Replace in place to keep registration order stable across HMR.
    const index = definitions.findIndex((entry) => entry.id === definition.id)
    if (index !== -1) definitions[index] = erased
  } else {
    definitions.push(erased)
  }
  definitionsById.set(definition.id, erased)
}

/**
 * Fallback used when a draft item carries an unknown/corrupt type. It renders
 * nothing type-specific and is never savable, so the editor degrades
 * gracefully instead of throwing.
 */
const fallbackDefinition: ContentTypeDefinition = {
  id: "media",
  metadata: {
    collectKeys: () => [],
    useResolvedMap: () => new Map(),
    getKey: () => null,
  },
  card: {
    title: ({ labels }) => labels.unknownMedia,
    typeLabel: () => "—",
    badgeClassName: () => "bg-sidebar text-secondary",
    Thumbnail: () => null,
    LibraryDragOverlay: () => null,
  },
  capabilities: {
    showsDurationInput: false,
    canEditDuration: () => false,
  },
  createDraftItem: (source) => ({
    clientId: `draft-${crypto.randomUUID()}`,
    type: "media",
    mediaId: source.id,
    duration: 0,
  }),
  signatureFields: () => "",
  isSavable: () => false,
  toSavePayload: (item) => ({ type: item.type, duration: item.duration }),
}

/** Lookup a definition by type. Returns a safe fallback for unknown types. */
export function getContentTypeDefinition(
  type: ContentItemType,
): ContentTypeDefinition {
  return definitionsById.get(type) ?? fallbackDefinition
}

/** All registered definitions, in registration order. */
export function listContentTypes(): ContentTypeDefinition[] {
  return definitions
}

import { create } from "zustand"

import type { CloudPickResult } from "@/features/media/cloud/types/cloudPick.types"

interface StagedItemBase {
  /** Client-generated, stable for the lifetime of the staged item. */
  id: string
  name: string
  sizeBytes: number
  mimeType: string
  /** Object URL (local) or provider thumbnail (cloud); may be absent. */
  previewUrl?: string
}

export interface LocalStagedItem extends StagedItemBase {
  kind: "local"
  previewUrl: string
  file: File
}

export interface CloudStagedItem extends StagedItemBase {
  kind: "cloud"
  pick: CloudPickResult
}

export type StagedItem = LocalStagedItem | CloudStagedItem

interface StagingStoreState {
  items: StagedItem[]
  /** Adds local files; creates object URLs and dedupes by name+size. */
  addLocalFiles: (files: File[]) => void
  /** Adds cloud picks; dedupes by provider+externalId. */
  addCloudItems: (picks: CloudPickResult[]) => void
  /** Removes one item, revoking its object URL when local. */
  removeItem: (id: string) => void
  /** Removes everything, revoking all local object URLs. */
  clearStaging: () => void
}

function revokeLocal(item: StagedItem): void {
  if (item.kind === "local") {
    URL.revokeObjectURL(item.previewUrl)
  }
}

/**
 * Transient buffer shared by the upload drawer's dropzone, cloud-provider
 * cards, the staging grid, and the commit footer. Holds both local files and
 * cloud picks until the user commits them. Centralizes object-URL lifecycle so
 * previews never leak. Not persisted — `File`s aren't serializable and a closed
 * drawer should start fresh.
 */
export const useStagingStore = create<StagingStoreState>((set, get) => ({
  items: [],

  addLocalFiles: (files) => {
    const existing = get().items
    const newItems: LocalStagedItem[] = []

    for (const file of files) {
      const isDuplicate =
        existing.some(
          (item) =>
            item.kind === "local" &&
            item.name === file.name &&
            item.sizeBytes === file.size,
        ) ||
        newItems.some(
          (item) => item.name === file.name && item.sizeBytes === file.size,
        )
      if (isDuplicate) continue

      newItems.push({
        kind: "local",
        id: crypto.randomUUID(),
        name: file.name,
        sizeBytes: file.size,
        mimeType: file.type,
        previewUrl: URL.createObjectURL(file),
        file,
      })
    }

    if (newItems.length === 0) return
    set((state) => ({ items: [...state.items, ...newItems] }))
  },

  addCloudItems: (picks) => {
    const existing = get().items
    const newItems: CloudStagedItem[] = []

    for (const pick of picks) {
      const isDuplicate =
        existing.some(
          (item) =>
            item.kind === "cloud" &&
            item.pick.provider === pick.provider &&
            item.pick.externalId === pick.externalId,
        ) ||
        newItems.some(
          (item) =>
            item.pick.provider === pick.provider &&
            item.pick.externalId === pick.externalId,
        )
      if (isDuplicate) continue

      newItems.push({
        kind: "cloud",
        id: crypto.randomUUID(),
        name: pick.name,
        sizeBytes: pick.sizeBytes,
        mimeType: pick.mimeType,
        ...(pick.thumbnailUrl ? { previewUrl: pick.thumbnailUrl } : {}),
        pick,
      })
    }

    if (newItems.length === 0) return
    set((state) => ({ items: [...state.items, ...newItems] }))
  },

  removeItem: (id) => {
    const target = get().items.find((item) => item.id === id)
    if (target) revokeLocal(target)
    set((state) => ({ items: state.items.filter((item) => item.id !== id) }))
  },

  clearStaging: () => {
    get().items.forEach(revokeLocal)
    set({ items: [] })
  },
}))

import type { MediaItem } from "@/features/media/types/media.types"

export const FOLDER_TREE_ROOT_ID = "__root__"

export interface FolderTreeNode {
  id: string
  name: string
  children: FolderTreeNode[]
}

export function collectDescendantIds(
  items: MediaItem[],
  parentId: string
): string[] {
  const children = items.filter((item) => item.parentId === parentId)
  return children.flatMap((child) => [
    child.id,
    ...(child.type === "folder" ? collectDescendantIds(items, child.id) : []),
  ])
}

export function buildExcludedFolderIds(
  items: MediaItem[],
  itemIds: string[]
): Set<string> {
  const ids = new Set(itemIds)
  for (const id of itemIds) {
    collectDescendantIds(items, id).forEach((descendantId) => {
      ids.add(descendantId)
    })
  }
  return ids
}

export function buildFolderTree(
  items: MediaItem[],
  excludeIds: Set<string>,
  parentId: string | null = null
): FolderTreeNode[] {
  return items
    .filter(
      (item) =>
        item.type === "folder" &&
        item.parentId === parentId &&
        !excludeIds.has(item.id)
    )
    .map((folder) => ({
      id: folder.id,
      name: folder.name,
      children: buildFolderTree(items, excludeIds, folder.id),
    }))
}

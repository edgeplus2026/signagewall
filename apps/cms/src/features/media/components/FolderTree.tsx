import { ChevronDownIcon, ChevronRightIcon, FolderIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import {
  FOLDER_TREE_ROOT_ID,
  type FolderTreeNode,
} from "@/features/media/lib/folderTree"
import { cn } from "@/lib/utils"

interface FolderTreeProps {
  nodes: FolderTreeNode[]
  selectedId: string | null
  disabledIds?: Set<string>
  onSelect: (folderId: string | null) => void
  defaultExpandedIds?: string[]
}

interface FolderTreeRowProps {
  name: string
  depth: number
  hasChildren: boolean
  isExpanded: boolean
  isSelected: boolean
  isDisabled: boolean
  isRoot?: boolean
  onToggle: () => void
  onSelect: () => void
}

function FolderTreeRow({
  name,
  depth,
  hasChildren,
  isExpanded,
  isSelected,
  isDisabled,
  isRoot,
  onToggle,
  onSelect,
}: FolderTreeRowProps) {
  return (
    <div
      role="treeitem"
      aria-selected={isSelected}
      aria-expanded={hasChildren ? isExpanded : undefined}
      className={cn(
        "flex items-center gap-1 rounded-md pr-2 transition-colors",
        !isDisabled && !isSelected && "hover:bg-highlight/60",
        isSelected && "bg-highlight"
      )}
      style={{ paddingLeft: `${String(depth * 16)}px` }}
    >
      <button
        type="button"
        disabled={!hasChildren}
        onClick={onToggle}
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-md text-secondary transition-colors",
          hasChildren ? "hover:text-primary" : "invisible"
        )}
        aria-label={isExpanded ? "Collapse" : "Expand"}
      >
        {isExpanded ? (
          <ChevronDownIcon className="size-4" />
        ) : (
          <ChevronRightIcon className="size-4" />
        )}
      </button>

      <button
        type="button"
        disabled={isDisabled}
        onClick={onSelect}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left text-sm",
          isRoot && "font-medium",
          isDisabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"
        )}
      >
        <FolderIcon
          className={cn(
            "size-4 shrink-0",
            isSelected || isRoot ? "text-primary" : "text-secondary"
          )}
        />
        <span className="truncate">{name}</span>
      </button>
    </div>
  )
}

function FolderTreeBranch({
  node,
  depth,
  expandedIds,
  selectedId,
  disabledIds,
  onToggle,
  onSelect,
}: {
  node: FolderTreeNode
  depth: number
  expandedIds: Set<string>
  selectedId: string | null
  disabledIds: Set<string>
  onToggle: (id: string) => void
  onSelect: (folderId: string | null) => void
}) {
  const hasChildren = node.children.length > 0
  const isExpanded = expandedIds.has(node.id)

  return (
    <>
      <FolderTreeRow
        name={node.name}
        depth={depth}
        hasChildren={hasChildren}
        isExpanded={isExpanded}
        isSelected={selectedId === node.id}
        isDisabled={disabledIds.has(node.id)}
        onToggle={() => {
          onToggle(node.id)
        }}
        onSelect={() => {
          if (!disabledIds.has(node.id)) onSelect(node.id)
        }}
      />
      {hasChildren && isExpanded
        ? node.children.map((child) => (
            <FolderTreeBranch
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              selectedId={selectedId}
              disabledIds={disabledIds}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))
        : null}
    </>
  )
}

export function FolderTree({
  nodes,
  selectedId,
  disabledIds = new Set(),
  onSelect,
  defaultExpandedIds = [FOLDER_TREE_ROOT_ID],
}: FolderTreeProps) {
  const { t } = useTranslation()
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(defaultExpandedIds)
  )

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const rootExpanded = expandedIds.has(FOLDER_TREE_ROOT_ID)
  const rootDisabled = disabledIds.has(FOLDER_TREE_ROOT_ID)
  const rootSelected = selectedId === null

  return (
    <div
      role="tree"
      className="flex flex-col gap-0.5 rounded-xl border border-secondary bg-panel p-1.5"
    >
      <FolderTreeRow
        name={t("media.move.library")}
        depth={0}
        hasChildren={nodes.length > 0}
        isExpanded={rootExpanded}
        isSelected={rootSelected}
        isDisabled={rootDisabled}
        isRoot
        onToggle={() => {
          toggleExpanded(FOLDER_TREE_ROOT_ID)
        }}
        onSelect={() => {
          if (!rootDisabled) onSelect(null)
        }}
      />

      {rootExpanded
        ? nodes.map((node) => (
            <FolderTreeBranch
              key={node.id}
              node={node}
              depth={0}
              expandedIds={expandedIds}
              selectedId={selectedId}
              disabledIds={disabledIds}
              onToggle={toggleExpanded}
              onSelect={onSelect}
            />
          ))
        : null}
    </div>
  )
}

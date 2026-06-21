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
        "flex items-center border-b border-secondary last:border-b-0",
        isRoot ? "bg-sidebar" : "bg-panel"
      )}
    >
      <div
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2 py-2.5 pr-3",
          isRoot ? "px-3" : "pl-3"
        )}
        style={
          isRoot ? undefined : { paddingLeft: `${String(12 + depth * 16)}px` }
        }
      >
        <button
          type="button"
          disabled={!hasChildren}
          onClick={onToggle}
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-sm text-secondary",
            hasChildren && "hover:bg-highlight",
            !hasChildren && "invisible"
          )}
          aria-label={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? (
            <ChevronDownIcon className="size-3.5" />
          ) : (
            <ChevronRightIcon className="size-3.5" />
          )}
        </button>

        <button
          type="button"
          disabled={isDisabled}
          onClick={onSelect}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 text-left text-sm transition-colors",
            isRoot && "font-medium",
            !isRoot && "rounded-md px-1 py-0.5 hover:bg-highlight/50",
            isSelected && !isRoot && "bg-highlight",
            isSelected && isRoot && "rounded-md ring-2 ring-inset ring-brand/40",
            isDisabled && "cursor-not-allowed opacity-40"
          )}
        >
          <FolderIcon
            className={cn(
              "size-4 shrink-0",
              isRoot ? "text-primary" : "text-secondary"
            )}
          />
          <span className="truncate">{name}</span>
        </button>
      </div>
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
    <div role="tree" className="overflow-hidden rounded-xl border border-secondary">
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

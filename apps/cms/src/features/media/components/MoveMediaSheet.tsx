import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { FolderTree } from "@/features/media/components/FolderTree"
import {
  useAllFolders,
  useFolderPath,
  useMoveMedia,
} from "@/features/media/hooks/useMedia"
import {
  buildExcludedFolderIds,
  buildFolderTree,
  FOLDER_TREE_ROOT_ID,
} from "@/features/media/lib/folderTree"

interface MoveMediaSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemIds: string[]
  currentFolderId: string | null
  onSuccess?: () => void
}

export function MoveMediaSheet({
  open,
  onOpenChange,
  itemIds,
  currentFolderId,
  onSuccess,
}: MoveMediaSheetProps) {
  const { t } = useTranslation()
  const moveMedia = useMoveMedia()
  const { data: allFolders = [] } = useAllFolders()
  const { data: folderPath = [] } = useFolderPath(currentFolderId)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)

  const { tree, disabledIds, defaultExpandedIds } = useMemo(() => {
    const excludeIds = buildExcludedFolderIds(allFolders, itemIds)
    const tree = buildFolderTree(allFolders, excludeIds)

    const disabled = new Set<string>()
    if (currentFolderId === null) {
      disabled.add(FOLDER_TREE_ROOT_ID)
    } else {
      disabled.add(currentFolderId)
    }

    const expanded = [FOLDER_TREE_ROOT_ID, ...folderPath.map((folder) => folder.id)]

    return {
      tree,
      disabledIds: disabled,
      defaultExpandedIds: expanded,
    }
  }, [allFolders, currentFolderId, folderPath, itemIds])

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setSelectedFolderId(null)
    }
    onOpenChange(nextOpen)
  }

  const handleMove = async () => {
    if (itemIds.length === 0) return

    const isRootDisabled = currentFolderId === null && selectedFolderId === null
    const isSameFolder = selectedFolderId === currentFolderId

    if (isRootDisabled || isSameFolder) {
      return
    }

    try {
      await moveMedia.mutateAsync({
        ids: itemIds,
        targetFolderId: selectedFolderId,
      })
      toast.success(t("media.move.success"))
      onSuccess?.()
      handleOpenChange(false)
    } catch {
      toast.error(t("media.move.error"))
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t("media.move.title")}</SheetTitle>
          <SheetDescription>
            {t("media.move.description", { count: itemIds.length })}
          </SheetDescription>
        </SheetHeader>

        <div className="visible-scrollbar min-h-0 flex-1 overflow-y-auto py-2 px-3">
          <FolderTree
            nodes={tree}
            selectedId={selectedFolderId}
            disabledIds={disabledIds}
            defaultExpandedIds={defaultExpandedIds}
            onSelect={setSelectedFolderId}
          />
        </div>

        <SheetFooter className="flex-row justify-end gap-2 border-t border-secondary">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              handleOpenChange(false)
            }}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            disabled={moveMedia.isPending}
            onClick={() => {
              void handleMove()
            }}
          >
            {t("media.move.submit")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

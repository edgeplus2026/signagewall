import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useDeleteMedia } from "@/features/media/hooks/useMedia"

interface DeleteMediaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemIds: string[]
  onSuccess?: () => void
}

export function DeleteMediaDialog({
  open,
  onOpenChange,
  itemIds,
  onSuccess,
}: DeleteMediaDialogProps) {
  const { t } = useTranslation()
  const deleteMedia = useDeleteMedia()

  const handleDelete = async () => {
    if (itemIds.length === 0) return

    try {
      await deleteMedia.mutateAsync(itemIds)
      toast.success(t("media.delete.success"))
      onOpenChange(false)
      onSuccess?.()
    } catch {
      toast.error(t("media.delete.error"))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t("media.delete.title")}</DialogTitle>
          <DialogDescription>
            {t("media.delete.description", { count: itemIds.length })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {t("media.delete.cancel")}
          </Button>
          <Button
            variant="danger"
            disabled={deleteMedia.isPending}
            onClick={() => void handleDelete()}
          >
            {t("media.delete.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

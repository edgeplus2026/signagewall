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
import { useDeleteScreens } from "@/features/screens/hooks/useScreens"

interface DeleteScreenDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  screenIds: string[]
  onSuccess?: () => void
}

export function DeleteScreenDialog({
  open,
  onOpenChange,
  screenIds,
  onSuccess,
}: DeleteScreenDialogProps) {
  const { t } = useTranslation()
  const deleteScreens = useDeleteScreens()

  const handleDelete = async () => {
    if (screenIds.length === 0) return

    try {
      await deleteScreens.mutateAsync(screenIds)
      toast.success(t("screens.delete.success"))
      onOpenChange(false)
      onSuccess?.()
    } catch {
      toast.error(t("screens.delete.error"))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t("screens.delete.title")}</DialogTitle>
          <DialogDescription>
            {t("screens.delete.description", { count: screenIds.length })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {t("screens.delete.cancel")}
          </Button>
          <Button
            variant="danger"
            disabled={deleteScreens.isPending}
            onClick={() => void handleDelete()}
          >
            {t("screens.delete.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

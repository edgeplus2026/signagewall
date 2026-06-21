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
import { useDeleteUser } from "@/features/users/hooks/useUsers"
import type { User } from "@/features/users/types/user.types"

interface DeleteUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
}

export function DeleteUserDialog({
  open,
  onOpenChange,
  user,
}: DeleteUserDialogProps) {
  const { t } = useTranslation()
  const deleteUser = useDeleteUser()

  const handleDelete = async () => {
    if (!user) return

    try {
      await deleteUser.mutateAsync(user.id)
      toast.success(t("users.delete.success"))
      onOpenChange(false)
    } catch {
      toast.error(t("users.delete.error"))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t("users.delete.title")}</DialogTitle>
          <DialogDescription>
            {t("users.delete.description", { name: user?.name })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {t("users.delete.cancel")}
          </Button>
          <Button
            variant="danger"
            disabled={deleteUser.isPending}
            onClick={() => void handleDelete()}
          >
            {t("users.delete.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

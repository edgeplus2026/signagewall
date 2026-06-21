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
import { useDeletePlaylists } from "@/features/playlists/hooks/usePlaylists"
import { getApiErrorMessage } from "@/lib/api-error"

interface DeletePlaylistDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  playlistIds: string[]
  onSuccess?: () => void
}

export function DeletePlaylistDialog({
  open,
  onOpenChange,
  playlistIds,
  onSuccess,
}: DeletePlaylistDialogProps) {
  const { t } = useTranslation()
  const deletePlaylists = useDeletePlaylists()

  const handleDelete = async () => {
    if (playlistIds.length === 0) return

    try {
      await deletePlaylists.mutateAsync(playlistIds)
      toast.success(t("playlists.delete.success"))
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("playlists.delete.error")))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t("playlists.delete.title")}</DialogTitle>
          <DialogDescription>
            {t("playlists.delete.description", { count: playlistIds.length })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {t("playlists.delete.cancel")}
          </Button>
          <Button
            variant="danger"
            disabled={deletePlaylists.isPending}
            onClick={() => void handleDelete()}
          >
            {t("playlists.delete.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

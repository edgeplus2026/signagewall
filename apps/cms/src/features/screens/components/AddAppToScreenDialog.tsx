import { AppWindowIcon, PlusIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAllAppInstances } from "@/features/apps/hooks/useApps"

interface AddAppToScreenDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (appInstanceId: string) => void
}

/** Picks an app instance to append to the screen's content. */
export function AddAppToScreenDialog({
  open,
  onOpenChange,
  onAdd,
}: AddAppToScreenDialogProps) {
  const { t } = useTranslation()
  const { data: instances = [], isLoading } = useAllAppInstances()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("screens.content.addApp.title")}</DialogTitle>
          <DialogDescription>
            {t("screens.content.addApp.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
          {isLoading ? (
            <p className="text-secondary px-1 py-6 text-center text-sm">
              {t("common.loading")}
            </p>
          ) : instances.length === 0 ? (
            <p className="text-secondary px-1 py-6 text-center text-sm">
              {t("screens.content.addApp.empty")}
            </p>
          ) : (
            instances.map((instance) => (
              <button
                key={instance.id}
                type="button"
                className="group hover:bg-sidebar flex items-center gap-3 rounded-lg px-3 py-2 text-left"
                onClick={() => {
                  onAdd(instance.id)
                  onOpenChange(false)
                }}
              >
                <span className="bg-sidebar flex size-9 shrink-0 items-center justify-center rounded-md">
                  <AppWindowIcon className="text-secondary size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-primary block truncate text-sm">
                    {instance.name}
                  </span>
                  <span className="text-secondary block truncate text-xs">
                    {instance.appSlug}
                  </span>
                </span>
                <span className="text-secondary group-hover:text-primary inline-flex items-center gap-1 text-xs">
                  <PlusIcon className="size-3.5" />
                  {t("screens.content.addApp.add")}
                </span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

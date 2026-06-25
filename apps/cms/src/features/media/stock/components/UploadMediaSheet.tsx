import { Loader2Icon } from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toCloudImportItem } from "@/features/media/cloud/lib/toCloudImportItem"
import { useImportCloudMedia } from "@/features/media/hooks/useImportCloudMedia"
import { validateStagedItems } from "@/features/media/lib/validateStagedItems"
import { MyDeviceTab } from "@/features/media/stock/components/MyDeviceTab"
import { StockMediaTab } from "@/features/media/stock/components/StockMediaTab"
import { useStagingStore } from "@/features/media/store/stagingStore"
import { useUploadStore } from "@/features/media/store/uploadStore"

interface UploadMediaSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Destination folder for both device uploads and cloud imports. */
  parentId: string | null
  onAddToPlaylist: (mediaId: string) => void
  onAddToScreen: (mediaId: string) => void
}

export function UploadMediaSheet({
  open,
  onOpenChange,
  parentId,
  onAddToPlaylist,
  onAddToScreen,
}: UploadMediaSheetProps) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<"device" | "stock">("device")

  const items = useStagingStore((state) => state.items)
  const clearStaging = useStagingStore((state) => state.clearStaging)
  const enqueueFiles = useUploadStore((state) => state.enqueueFiles)
  const importCloud = useImportCloudMedia()

  const validation = useMemo(() => validateStagedItems(items, t), [items, t])

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      clearStaging()
    }
    onOpenChange(next)
  }

  const handleUpload = async () => {
    const valid = validation.validItems
    if (valid.length === 0) return

    const cloudItems = valid
      .filter((item) => item.kind === "cloud")
      .map((item) => toCloudImportItem(item.pick))

    // Cloud import first (it can fail): only commit local files and close once
    // the network step succeeds, so a failure leaves the batch intact for retry.
    if (cloudItems.length > 0) {
      try {
        const response = await importCloud.mutateAsync({
          parentId,
          items: cloudItems,
        })
        if (response.failedCount > 0) {
          toast.warning(
            t("media.cloudImport.partial", {
              imported: response.importedCount,
              failed: response.failedCount,
            }),
          )
        } else {
          toast.success(
            t("media.cloudImport.success", { count: response.importedCount }),
          )
        }
      } catch {
        toast.error(t("media.cloudImport.error"))
        return
      }
    }

    const localFiles = valid
      .filter((item) => item.kind === "local")
      .map((item) => item.file)

    if (localFiles.length > 0) {
      enqueueFiles(localFiles, parentId)
      toast.success(t("media.upload.queued", { count: localFiles.length }))
    }

    clearStaging()
    onOpenChange(false)
  }

  const showFooter = tab === "device" && items.length > 0

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="h-[85vh] max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>{t("media.upload.sheet.title")}</DrawerTitle>
          <DrawerDescription>
            {t("media.upload.sheet.description")}
          </DrawerDescription>
        </DrawerHeader>

        <Tabs
          value={tab}
          onValueChange={(value) => {
            setTab(value as "device" | "stock")
          }}
          className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-2"
        >
          <TabsList className="mr-auto">
            <TabsTrigger value="device">
              {t("media.upload.sheet.deviceTab")}
            </TabsTrigger>
            <TabsTrigger value="stock">
              {t("media.upload.sheet.stockTab")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="device" className="min-h-0 flex-1">
            <MyDeviceTab errorById={validation.errorById} />
          </TabsContent>

          <TabsContent value="stock" className="min-h-0 flex-1">
            <StockMediaTab
              parentId={parentId}
              onAddToPlaylist={onAddToPlaylist}
              onAddToScreen={onAddToScreen}
            />
          </TabsContent>
        </Tabs>

        {showFooter ? (
          <DrawerFooter>
            {validation.batchErrors.length > 0 ? (
              <p className="text-danger text-xs">{validation.batchErrors[0]}</p>
            ) : null}
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearStaging}
              >
                {t("media.staging.clear")}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={
                  validation.validItems.length === 0 || importCloud.isPending
                }
                onClick={() => void handleUpload()}
              >
                {importCloud.isPending ? (
                  <Loader2Icon data-icon="inline-start" className="animate-spin" />
                ) : null}
                {t("media.staging.upload", {
                  count: validation.validItems.length,
                })}
              </Button>
            </div>
          </DrawerFooter>
        ) : null}
      </DrawerContent>
    </Drawer>
  )
}

import { useTranslation } from "react-i18next"

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MyDeviceTab } from "@/features/media/stock/components/MyDeviceTab"
import { StockMediaTab } from "@/features/media/stock/components/StockMediaTab"

interface UploadMediaSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Destination folder for both device uploads and stock imports. */
  parentId: string | null
  /** Feeds selected device files into the existing upload pipeline. */
  onUploadFiles: (files: File[]) => void
  onAddToPlaylist: (mediaId: string) => void
  onAddToScreen: (mediaId: string) => void
}

export function UploadMediaSheet({
  open,
  onOpenChange,
  parentId,
  onUploadFiles,
  onAddToPlaylist,
  onAddToScreen,
}: UploadMediaSheetProps) {
  const { t } = useTranslation()

  const handleDeviceFiles = (files: File[]) => {
    onUploadFiles(files)
    // Uploads continue in the background via the global upload manager.
    onOpenChange(false)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[85vh] max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>{t("media.upload.sheet.title")}</DrawerTitle>
          <DrawerDescription>
            {t("media.upload.sheet.description")}
          </DrawerDescription>
        </DrawerHeader>

        <Tabs
          defaultValue="device"
          className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4"
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
            <MyDeviceTab onFilesSelected={handleDeviceFiles} />
          </TabsContent>

          <TabsContent value="stock" className="min-h-0 flex-1">
            <StockMediaTab
              parentId={parentId}
              onAddToPlaylist={onAddToPlaylist}
              onAddToScreen={onAddToScreen}
            />
          </TabsContent>
        </Tabs>
      </DrawerContent>
    </Drawer>
  )
}

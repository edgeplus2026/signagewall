import { ExternalLinkIcon, ListVideoIcon, MonitorIcon, ImportIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useImportStockMedia, useStockMediaItem } from '@/features/media/stock/hooks/useStockMedia'
import { formatStockDuration, getOrientation } from '@/features/media/stock/lib/stockMediaUtils'
import type { StockMediaItem } from '@/features/media/stock/types/stockMedia.types'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'

type ImportAction = 'import' | 'playlist' | 'screen'

interface StockMediaPreviewDialogProps {
  item: StockMediaItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  parentId: string | null
  onAddToPlaylist: (mediaId: string) => void
  onAddToScreen: (mediaId: string) => void
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-secondary">{label}</span>
      <span className="text-primary truncate font-medium" title={value}>
        {value}
      </span>
    </div>
  )
}

export function StockMediaPreviewDialog({
  item,
  open,
  onOpenChange,
  parentId,
  onAddToPlaylist,
  onAddToScreen,
}: StockMediaPreviewDialogProps) {
  const { t } = useTranslation()
  const importMutation = useImportStockMedia()
  const [pendingAction, setPendingAction] = useState<ImportAction | null>(null)
  // Tracks which item's preview media has finished loading. Deriving the
  // loading flag by comparing to the current item resets it automatically when
  // a different item is opened — no effect needed.
  const [loadedItemId, setLoadedItemId] = useState<string | null>(null)

  const { data: detail } = useStockMediaItem(item?.id ?? null, item?.mediaType ?? null)

  // The list item already carries enough to render; the detail query enriches
  // it (and provides a reliable playable URL) once it arrives.
  const active = detail ?? item

  const runImport = async (action: ImportAction): Promise<string | null> => {
    if (!item) return null

    setPendingAction(action)
    const toastId = toast.loading(t('media.stock.preview.importing'))

    try {
      const media = await importMutation.mutateAsync({
        id: item.id,
        mediaType: item.mediaType,
        parentId,
      })
      toast.success(t('media.stock.preview.imported'), { id: toastId })
      return media.id
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('media.stock.preview.importError')), { id: toastId })
      return null
    } finally {
      setPendingAction(null)
    }
  }

  const handleImport = async () => {
    const mediaId = await runImport('import')
    if (mediaId) {
      onOpenChange(false)
    }
  }

  const handleAddToPlaylist = async () => {
    const mediaId = await runImport('playlist')
    if (mediaId) {
      onOpenChange(false)
      onAddToPlaylist(mediaId)
    }
  }

  const handleAddToScreen = async () => {
    const mediaId = await runImport('screen')
    if (mediaId) {
      onOpenChange(false)
      onAddToScreen(mediaId)
    }
  }

  const isVideo = active?.mediaType === 'video'
  const isBusy = pendingAction !== null
  const mediaLoaded = !!active && loadedItemId === active.id

  const handleMediaLoaded = () => {
    if (active) setLoadedItemId(active.id)
  }
  const trimmedAlt = active?.alt?.trim()
  const titleText =
    trimmedAlt && trimmedAlt.length > 0 ? trimmedAlt : (active?.author ?? t('media.stock.title'))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-secondary border-b px-5 py-4 pr-10 text-left">
          <DialogTitle className="truncate">{titleText}</DialogTitle>
          {active ? (
            <DialogDescription>
              {t('media.stock.preview.attribution', { author: active.author })}{' '}
              <a
                href={active.sourceUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-brand inline-flex items-center gap-0.5 hover:underline"
              >
                {t('media.stock.preview.viewOnPexels')}
                <ExternalLinkIcon className="size-3" />
              </a>
            </DialogDescription>
          ) : null}
        </DialogHeader>

        <div className="visible-scrollbar flex-1 overflow-y-auto p-5">
          <div className="grid gap-5 sm:grid-cols-[1.6fr_1fr]">
            <div className="bg-sidebar border-secondary relative flex items-center justify-center overflow-hidden rounded-xl border">
              {!mediaLoaded ? <Skeleton className="aspect-video w-full" /> : null}

              {active ? (
                isVideo ? (
                  <video
                    src={active.videoUrl}
                    poster={active.previewUrl}
                    controls
                    playsInline
                    onLoadedData={handleMediaLoaded}
                    className={cn(
                      'max-h-[55vh] w-full bg-black object-contain',
                      !mediaLoaded && 'invisible absolute',
                    )}
                  />
                ) : (
                  <img
                    src={active.previewUrl}
                    alt={active.alt ?? active.author}
                    onLoad={handleMediaLoaded}
                    onError={handleMediaLoaded}
                    className={cn(
                      'max-h-[55vh] w-full object-contain',
                      !mediaLoaded && 'invisible absolute',
                    )}
                  />
                )
              ) : null}
            </div>

            <div className="flex flex-col gap-2.5">
              {active ? (
                <>
                  <MetaRow label={t('media.stock.preview.author')} value={active.author} />
                  <MetaRow
                    label={t('media.stock.preview.dimensions')}
                    value={`${String(active.width)} × ${String(active.height)}`}
                  />
                  <MetaRow
                    label={t('media.stock.preview.orientation')}
                    value={t(`media.stock.orientation.${getOrientation(active)}`)}
                  />
                  <MetaRow
                    label={t('media.stock.preview.mediaType')}
                    value={t(`media.stock.mediaType.${active.mediaType}`)}
                  />
                  {active.duration !== undefined ? (
                    <MetaRow
                      label={t('media.stock.preview.duration')}
                      value={formatStockDuration(active.duration)}
                    />
                  ) : null}
                </>
              ) : (
                <>
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-2/3" />
                </>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="border-secondary mx-0 mb-0 flex-col gap-2 rounded-none border-t px-5 py-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isBusy}
            onClick={() => {
              void handleAddToPlaylist()
            }}
          >
            <ListVideoIcon data-icon="inline-start" />
            {t('media.stock.preview.addToPlaylist')}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isBusy}
            onClick={() => {
              void handleAddToScreen()
            }}
          >
            <MonitorIcon data-icon="inline-start" />
            {t('media.stock.preview.addToScreen')}
          </Button>
          <Button
            type="button"
            disabled={isBusy}
            onClick={() => {
              void handleImport()
            }}
          >
            <ImportIcon data-icon="inline-start" />
            {t('media.stock.preview.import')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

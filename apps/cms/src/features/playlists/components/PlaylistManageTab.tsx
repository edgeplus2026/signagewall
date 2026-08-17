import {
  CopyIcon,
  EyeIcon,
  ListXIcon,
  MonitorIcon,
  MoreHorizontalIcon,
  Trash2Icon,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ContentEditor,
  type ContentEditorLabels,
} from '@/features/content/components/ContentEditor'
import { ContentPreviewDialog } from '@/features/content/components/ContentPreviewDialog'
import { useContentContainer } from '@/features/content/hooks/useContentContainer'
import {
  createAppDraftItem,
  createMediaDraftItem,
} from '@/features/content/lib/contentDraft'
import { MediaDetailSheet } from '@/features/media/components/MediaDetailSheet'
import type { MediaItem } from '@/features/media/types/media.types'
import { DeletePlaylistDialog } from '@/features/playlists/components/DeletePlaylistDialog'
import { PlaylistManageSidebar } from '@/features/playlists/components/PlaylistManageSidebar'
import {
  useDuplicatePlaylist,
  useReplacePlaylistItems,
} from '@/features/playlists/hooks/usePlaylists'
import {
  playlistItemsToDraftItems,
  playlistToDraftItems,
} from '@/features/playlists/lib/playlistContentDraft'
import type { Playlist } from '@/features/playlists/types/playlist.types'
import { AddToScreenSheet } from '@/features/screens/components/AddToScreenSheet'
import { ApiError, getApiErrorMessage } from '@/lib/api-error'

interface PlaylistManageTabProps {
  playlist: Playlist
}

export function PlaylistManageTab({ playlist }: PlaylistManageTabProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const duplicatePlaylist = useDuplicatePlaylist()
  const replacePlaylistItems = useReplacePlaylistItems()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [addToScreenOpen, setAddToScreenOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [mediaToEdit, setMediaToEdit] = useState<MediaItem | null>(null)

  const { baseline, draftItems, setDraftItems, buildSavePayload } =
    useContentContainer({
      entity: playlist,
      entityKey: `${playlist.id}:${playlist.updatedAt}`,
      toBaseline: playlistToDraftItems,
    })

  const labels = useMemo<ContentEditorLabels>(
    () => ({
      libraryTitle: t('playlists.content.libraryTitle'),
      libraryDescription: t('playlists.content.libraryDescription'),
      librarySearch: t('playlists.content.librarySearch'),
      libraryBack: t('playlists.content.libraryBack'),
      libraryEmpty: t('playlists.content.libraryEmpty'),
      libraryEmptySearch: t('playlists.content.libraryEmptySearch'),
      playlistsTab: t('playlists.breadcrumb.root'),
      playlistsSearch: t('playlists.search'),
      playlistsEmpty: t('playlists.empty'),
      playlistsEmptySearch: t('playlists.emptySearch'),
      emptyTitle: t('playlists.content.emptyTitle'),
      emptyDescription: t('playlists.content.emptyDescription'),
      hintTitle: t('playlists.content.hintTitle'),
      hintDescription: t('playlists.content.hintDescription'),
      totalDuration: t('playlists.content.totalDuration'),
      itemsLabel: t('playlists.content.itemsLabel'),
      itemCount: 'playlists.content.itemCount',
      saveChanges: t('playlists.content.saveChanges'),
      removeItem: t('playlists.content.removeItem'),
      disableItem: t('playlists.content.disableItem'),
      enableItem: t('playlists.content.enableItem'),
      disabledBadge: t('playlists.content.disabledBadge'),
      removeDropZone: t('playlists.content.removeDropZone'),
      durationLabel: t('playlists.content.durationLabel'),
      mediaUnavailable: t('playlists.content.mediaUnavailable'),
      unknownMedia: t('playlists.content.unknownMedia'),
      unknownPlaylist: t('playlists.manage.notFound'),
      playlistType: t('playlists.breadcrumb.root'),
    }),
    [t],
  )

  const handleAddToContent = useCallback(
    (item: MediaItem) => {
      setDraftItems((current) => [...current, createMediaDraftItem(item.id, item)])
    },
    [setDraftItems],
  )

  const handleAddAppToContent = useCallback(
    (appInstanceId: string) => {
      setDraftItems((current) => [...current, createAppDraftItem(appInstanceId)])
    },
    [setDraftItems],
  )

  const handleSave = useCallback(async () => {
    try {
      const saved = await replacePlaylistItems.mutateAsync({
        id: playlist.id,
        payload: {
          expectedUpdatedAt: playlist.updatedAt,
          // Playlists hold media and app items; the registry mapper supplies
          // type/id/duration per content type.
          items: buildSavePayload(['media', 'app']).map((item) => ({
            ...(item.id ? { id: item.id } : {}),
            type: item.type === 'app' ? 'app' : 'media',
            ...(item.mediaId ? { mediaId: item.mediaId } : {}),
            ...(item.appInstanceId ? { appInstanceId: item.appInstanceId } : {}),
            duration: item.duration,
            ...(item.disabled ? { disabled: true } : {}),
          })),
        },
      })
      setDraftItems(playlistItemsToDraftItems(saved.items))
      toast.success(t('playlists.content.saveSuccess'))
    } catch (error) {
      // The hook reloads the playlist on conflict; the container keeps the
      // dirty draft on top of the fresh baseline, so the user reviews and
      // re-saves — knowing a re-save applies their edits over the other change.
      if (error instanceof ApiError && error.code === 'CONFLICT') {
        toast.error(t('playlists.content.conflict'))
        return
      }
      toast.error(getApiErrorMessage(error, t('playlists.content.saveError')))
    }
  }, [buildSavePayload, playlist.id, playlist.updatedAt, replacePlaylistItems, setDraftItems, t])

  const handlePreview = useCallback(() => {
    setPreviewOpen(true)
  }, [])

  const handleDuplicate = useCallback(async () => {
    try {
      const created = await duplicatePlaylist.mutateAsync({
        id: playlist.id,
        copySuffix: t('playlists.duplicate.copySuffix'),
      })
      void navigate(`/playlists/${created.id}`)
      toast.success(t('playlists.duplicate.redirected'))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('playlists.duplicate.error')))
    }
  }, [duplicatePlaylist, navigate, playlist.id, t])

  const handleClearContent = useCallback(() => {
    setDraftItems([])
  }, [setDraftItems])

  const handleEditMedia = useCallback((item: MediaItem) => {
    setMediaToEdit(item)
  }, [])

  const footerActions = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="icon-sm" className="size-9 shrink-0">
          <MoreHorizontalIcon />
          <span className="sr-only">{t('common.actions')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-52">
        <DropdownMenuItem onClick={handlePreview}>
          <EyeIcon />
          {t('playlists.actions.preview')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            void handleDuplicate()
          }}
        >
          <CopyIcon />
          {t('playlists.actions.duplicatePlaylist')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            setAddToScreenOpen(true)
          }}
        >
          <MonitorIcon />
          {t('playlists.manage.actions.addToScreen')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleClearContent}>
          <ListXIcon />
          {t('playlists.manage.actions.clearAllContent')}
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="danger"
          onClick={() => {
            setDeleteOpen(true)
          }}
        >
          <Trash2Icon />
          {t('playlists.manage.actions.moveToTrash')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <>
      <ContentEditor
        draftItems={draftItems}
        baseline={baseline}
        onDraftItemsChange={setDraftItems}
        onSave={handleSave}
        isSaving={replacePlaylistItems.isPending}
        labels={labels}
        footerActions={footerActions}
        onContentMediaUpdate={handleEditMedia}
        sidebar={
          <PlaylistManageSidebar
            allowedTypes={['media', 'app']}
            onAddToContent={handleAddToContent}
            onAddApp={handleAddAppToContent}
            onEditMedia={handleEditMedia}
          />
        }
      />

      <DeletePlaylistDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        playlistIds={[playlist.id]}
        onSuccess={() => {
          void navigate('/playlists')
        }}
      />

      <MediaDetailSheet
        open={mediaToEdit !== null}
        onOpenChange={(open) => {
          if (!open) setMediaToEdit(null)
        }}
        item={mediaToEdit}
      />

      <AddToScreenSheet
        open={addToScreenOpen}
        onOpenChange={setAddToScreenOpen}
        mode="playlists"
        playlistIds={[playlist.id]}
      />

      {/* The preview plays the SAVED playlist through the real player, so
          unsaved edits in the editor are not reflected until they're saved. */}
      <ContentPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        target={{ kind: 'playlist', playlistId: playlist.id }}
        name={playlist.name}
        itemCount={playlist.items.length}
      />
    </>
  )
}

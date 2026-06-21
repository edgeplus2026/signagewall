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
import { useContentContainer } from '@/features/content/hooks/useContentContainer'
import { createMediaDraftItem } from '@/features/content/lib/contentDraft'
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

  const handleSave = useCallback(async () => {
    try {
      const saved = await replacePlaylistItems.mutateAsync({
        id: playlist.id,
        payload: {
          expectedUpdatedAt: playlist.updatedAt,
          // Playlists hold media only; the registry mapper supplies id/duration.
          items: buildSavePayload(['media']).map((item) => ({
            ...(item.id ? { id: item.id } : {}),
            mediaId: item.mediaId ?? '',
            duration: item.duration,
            ...(item.disabled ? { disabled: true } : {}),
          })),
        },
      })
      setDraftItems(playlistItemsToDraftItems(saved.items))
      toast.success(t('playlists.content.saveSuccess'))
    } catch (error) {
      // The hook reloads the playlist on conflict; we just inform the user that
      // their unsaved changes were dropped in favor of the latest version.
      if (error instanceof ApiError && error.code === 'CONFLICT') {
        toast.error(t('playlists.content.conflict'))
        return
      }
      toast.error(getApiErrorMessage(error, t('playlists.content.saveError')))
    }
  }, [buildSavePayload, playlist.id, playlist.updatedAt, replacePlaylistItems, setDraftItems, t])

  const handlePreview = useCallback(() => {
    toast.message(t('playlists.manage.actions.previewComingSoon'))
  }, [t])

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
          {t('playlists.manage.actions.playlistPreview')}
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
            onAddToContent={handleAddToContent}
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
    </>
  )
}

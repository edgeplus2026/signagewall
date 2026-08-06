import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { usePlaylists } from '../hooks/usePlaylists'

import { AiGeneratorButton } from '@/features/ai-generator/components/AiGeneratorButton'
import { useAiGeneratorStore } from '@/features/ai-generator/store/aiGeneratorStore'
import { PlaylistFormSheet } from '@/features/playlists/components/PlaylistFormSheet'
import { PlaylistsBrowser } from '@/features/playlists/components/PlaylistsBrowser'
import { cn } from '@/lib/utils'

export default function PlaylistsPage() {
  const { t } = useTranslation()
  const [createOpen, setCreateOpen] = useState(false)
  const openAiGenerator = useAiGeneratorStore((state) => state.openList)

  const { data: playlists = [], isLoading, isError, refetch } = usePlaylists()

  return (
    <div className="flex w-full min-w-0 flex-col gap-7 lg:px-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-primary text-xl font-medium tracking-tight">
              {t('playlists.title')}
            </h1>
            <span
              className={cn(
                'bg-success/10 text-success inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium',
              )}
            >
              {t('playlists.playlistCount', { count: playlists.length })}
            </span>
          </div>

          <p className="text-secondary text-sm">{t('playlists.description')}</p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          <AiGeneratorButton
            className="w-full sm:w-auto"
            onClick={() => {
              openAiGenerator()
            }}
          />
        </div>
      </div>

      <PlaylistsBrowser
        playlists={playlists}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        onCreateClick={() => {
          setCreateOpen(true)
        }}
      />

      <PlaylistFormSheet open={createOpen} onOpenChange={setCreateOpen} mode="create" />
    </div>
  )
}

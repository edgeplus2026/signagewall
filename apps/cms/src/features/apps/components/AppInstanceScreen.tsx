import { AppPreviewFrame } from '@/features/apps/components/AppPreviewFrame'
import { useAppPreviewData } from '@/features/apps/hooks/useAppPreviewData'
import type { AppInstanceConfig, CatalogApp } from '@/features/apps/types/app.types'

interface AppInstanceScreenProps {
  app: CatalogApp
  config: AppInstanceConfig
}

/** Apps that can produce sound — the preview offers an unmute control for these. */
const AUDIO_CAPABLE_SLUGS = new Set(['stream', 'youtube'])

/**
 * The content shown inside the live-preview TV screen. Generic for every app:
 * mounts the same embed bundle the player runs and drives it with the live draft
 * config (plus, for `server` apps, the connector payload from the preview-data
 * endpoint). No per-app code — adding an app needs no change here.
 */
export function AppInstanceScreen({ app, config }: AppInstanceScreenProps) {
  const { data, meta } = useAppPreviewData(app, config)
  return (
    <AppPreviewFrame
      slug={app.slug}
      config={config}
      data={data}
      meta={meta}
      audioCapable={AUDIO_CAPABLE_SLUGS.has(app.slug)}
    />
  )
}

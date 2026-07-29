import { SchemaForm } from '@/features/apps/config-form'
import type { AppInstanceConfig, CatalogApp } from '@/features/apps/types/app.types'

interface AppInstanceConfigSidebarProps {
  app: CatalogApp
  /** Used as the SchemaForm reset key so switching instances reinitialises it. */
  instanceId: string
  config: AppInstanceConfig
  onConfigChange: (config: AppInstanceConfig) => void
}

/**
 * The left column of the instance config screen: the app's config options,
 * rendered from its schema. On desktop (`lg`) this is the only scrollable region
 * while the app header, preview and save bar stay fixed; on smaller screens the
 * whole content area scrolls as one. The app header and instance-name field live
 * in the page's top bar.
 */
export function AppInstanceConfigSidebar({
  app,
  instanceId,
  config,
  onConfigChange,
}: AppInstanceConfigSidebarProps) {
  return (
    <aside className="w-full lg:w-96 lg:shrink-0 lg:overflow-y-auto lg:pr-1">
      <SchemaForm
        key={instanceId}
        schema={app.configSchema}
        value={config}
        onChange={onConfigChange}
        appSlug={app.slug}
        instanceId={instanceId}
      />
    </aside>
  )
}

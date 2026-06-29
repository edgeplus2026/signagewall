import { AppIcon } from '@/features/apps/components/AppIcon'
import { SchemaForm } from '@/features/apps/config-form'
import type { AppInstanceConfig, EdgeApp } from '@/features/apps/types/app.types'

interface AppInstanceConfigSidebarProps {
  app: EdgeApp
  /** Used as the SchemaForm reset key so switching instances reinitialises it. */
  instanceId: string
  config: AppInstanceConfig
  onConfigChange: (config: AppInstanceConfig) => void
}

export function AppInstanceConfigSidebar({
  app,
  instanceId,
  config,
  onConfigChange,
}: AppInstanceConfigSidebarProps) {
  return (
    <aside className="flex w-full flex-col gap-6 lg:w-80 lg:shrink-0">
      {/* App header */}
      <div className="flex items-start gap-3">
        <AppIcon iconSvg={app.iconSvg} color={app.color} className="size-12 rounded-xl shadow-md" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-sm font-semibold text-primary">{app.name}</h2>
          <p className="text-xs text-secondary">{app.tagline}</p>
        </div>
      </div>

      {/* Config fields — rendered from the app's schema. */}
      <SchemaForm
        key={instanceId}
        schema={app.configSchema}
        value={config}
        onChange={onConfigChange}
        appSlug={app.slug}
      />
    </aside>
  )
}

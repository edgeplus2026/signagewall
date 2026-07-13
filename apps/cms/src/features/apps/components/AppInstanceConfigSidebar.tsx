import { useTranslation } from 'react-i18next'

import { AppIcon } from '@/features/apps/components/AppIcon'
import { SchemaForm } from '@/features/apps/config-form'
import type { AppInstanceConfig, EdgeApp } from '@/features/apps/types/app.types'

interface AppInstanceConfigSidebarProps {
  app: EdgeApp
  /** Used as the SchemaForm reset key so switching instances reinitialises it. */
  instanceId: string
  /** Instance name (editable as the first form field). */
  name: string
  onNameChange: (name: string) => void
  config: AppInstanceConfig
  onConfigChange: (config: AppInstanceConfig) => void
}

export function AppInstanceConfigSidebar({
  app,
  instanceId,
  name,
  onNameChange,
  config,
  onConfigChange,
}: AppInstanceConfigSidebarProps) {
  const { t } = useTranslation()

  return (
    <aside className="flex w-full flex-col gap-6 lg:w-96 lg:shrink-0">
      {/* App header */}
      <div className="flex items-start gap-3">
        <AppIcon iconSvg={app.iconSvg} color={app.color} className="size-12 rounded-xl shadow-md" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-sm font-semibold text-primary">{app.name}</h2>
          <p className="text-xs text-secondary">{app.tagline}</p>
        </div>
      </div>

      {/* Name + config fields — rendered from the app's schema. */}
      <SchemaForm
        key={instanceId}
        schema={app.configSchema}
        value={config}
        onChange={onConfigChange}
        nameField={{
          value: name,
          label: t('apps.instances.config.name.label'),
          placeholder: t('apps.instances.config.name.placeholder'),
          requiredMessage: t('apps.instances.config.name.required'),
          onChange: onNameChange,
        }}
        appSlug={app.slug}
        instanceId={instanceId}
      />
    </aside>
  )
}

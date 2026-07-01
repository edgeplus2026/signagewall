import { PlugIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { AppIcon } from '@/features/apps/components/AppIcon'
import { useStartConnection } from '@/features/apps/hooks/useConnections'
import { getOAuthField } from '@/features/apps/lib/connectedApp'
import type { EdgeApp } from '@/features/apps/types/app.types'
import type { ConnectionProvider } from '@/features/apps/types/connection.types'

const PROVIDER_LABELS: Record<string, string> = {
  canva: 'Canva',
  google: 'Google',
  microsoft: 'Microsoft',
}

interface ConnectAppPromptProps {
  app: EdgeApp
  instanceId: string
}

/**
 * Centered "connect your account" call-to-action shown for a `connected` app
 * instance that has no connection yet. It's the only thing on the page until an
 * account is connected — clicking starts the per-instance OAuth flow, which
 * returns to this same instance with the connection bound.
 */
export function ConnectAppPrompt({ app, instanceId }: ConnectAppPromptProps) {
  const { t } = useTranslation()
  const startConnection = useStartConnection()

  const oauthField = getOAuthField(app.configSchema)
  const provider = oauthField?.provider
  const providerLabel = provider
    ? (PROVIDER_LABELS[provider] ?? provider)
    : app.name

  const connect = () => {
    if (!provider) return
    startConnection.mutate({
      provider: provider as ConnectionProvider,
      appSlug: app.slug,
      instanceId,
    })
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 py-16 text-center">
      <AppIcon
        iconSvg={app.iconSvg}
        color={app.color}
        className="size-16 rounded-2xl shadow-md"
      />
      <div className="flex max-w-sm flex-col gap-1.5">
        <h2 className="text-base font-semibold text-primary">
          {t('apps.connections.connectPromptTitle', { provider: providerLabel })}
        </h2>
        <p className="text-sm text-secondary">
          {t('apps.connections.connectPromptBody', { provider: providerLabel })}
        </p>
      </div>
      <Button
        type="button"
        className="gap-2"
        disabled={!provider || startConnection.isPending}
        onClick={connect}
      >
        <PlugIcon className="size-4" />
        {t('apps.connections.connectProvider', { provider: providerLabel })}
      </Button>
    </div>
  )
}

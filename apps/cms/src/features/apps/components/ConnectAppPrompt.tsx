import { PlugIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { AppIcon } from '@/features/apps/components/AppIcon'
import { useStartConnection } from '@/features/apps/hooks/useConnections'
import { getOAuthField } from '@/features/apps/lib/connectedApp'
import type { CatalogApp } from '@/features/apps/types/app.types'
import type { ConnectionProvider } from '@/features/apps/types/connection.types'

const PROVIDER_LABELS: Record<string, string> = {
  canva: 'Canva',
  google: 'Google',
  microsoft: 'Microsoft',
  // Instagram and Facebook both sign in with a Facebook account — that (not the
  // internal 'meta' provider id) is what the operator is asked for.
  meta: 'Facebook',
  linkedin: 'LinkedIn',
}

interface ConnectAppPromptProps {
  app: CatalogApp
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

  /**
   * The field's own `help` replaces the generic line when it has one.
   *
   * This prompt is the WHOLE page until an account is connected, so the config
   * form — and with it every `help` on it — is not rendered yet. The one text
   * that explains why an app called Instagram asks for Facebook was therefore
   * only readable after connecting, which is exactly too late: the operator sees
   * an Instagram icon over "Connect your Facebook account" and no reason given.
   *
   * Replaces rather than joins the generic line because every such `help` already
   * opens with "Sign in …" and would otherwise say it twice. Same untranslated
   * manifest string the config form renders — not new i18n debt, just shown at
   * the moment it answers something.
   */
  const explanation =
    oauthField?.help ??
    t('apps.connections.connectPromptBody', { provider: providerLabel })

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
      {/* max-w-md, not sm: an app-specific explanation runs to a sentence or
          two where the generic line is half of one. Measured at 14px/20px, the
          Instagram help sets in 2 lines here against 3 at max-w-sm; LinkedIn's
          (the longest) takes 4 either way. */}
      <div className="flex max-w-md flex-col gap-1.5">
        <h2 className="text-base font-semibold text-primary">
          {t('apps.connections.connectPromptTitle', { provider: providerLabel })}
        </h2>
        <p className="text-sm text-secondary">{explanation}</p>
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

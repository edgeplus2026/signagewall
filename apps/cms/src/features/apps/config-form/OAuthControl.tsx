import { CheckCircle2Icon, PlugIcon, RefreshCwIcon, XIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useAppSlug } from '@/features/apps/config-form/appSlugContext'
import { useConfigValues } from '@/features/apps/config-form/configValuesContext'
import type { FieldControlProps } from '@/features/apps/config-form/controls'
import { useInstanceId } from '@/features/apps/config-form/instanceIdContext'
import {
  useConnection,
  useDisconnectInstance,
  useStartConnection,
} from '@/features/apps/hooks/useConnections'
import { resolveOAuthProvider } from '@/features/apps/lib/connectedApp'
import type { ConnectionProvider } from '@/features/apps/types/connection.types'

/**
 * Renders the `oauth` config field. Connected: shows which account this
 * instance is connected as, with reconnect (switch account) and disconnect.
 * Not connected: an inline "Connect" button — apps whose auth is REQUIRED never
 * reach the form in this state (the page-level centered prompt covers it), but
 * apps with optional auth (menu board's sheet sync) connect from right here.
 *
 * The provider is resolved per {@link resolveOAuthProvider}: a static
 * `field.provider`, or dynamically from a sibling field via `providerFrom`
 * (menu: `source` gsheets → google, excel → microsoft). When the operator flips
 * the source while connected to the other provider, the control offers a
 * one-click switch (disconnect, then start the right provider's flow).
 */
export function OAuthControl({ field, value, disabled }: FieldControlProps) {
  const { t } = useTranslation()
  const appSlug = useAppSlug()
  const instanceId = useInstanceId()
  const values = useConfigValues()
  const connectionId = typeof value === 'string' ? value : ''
  const { data: connection } = useConnection(connectionId || undefined)
  const startConnection = useStartConnection()
  const disconnect = useDisconnectInstance()

  const wantedProvider = resolveOAuthProvider(field, values)
  const busy =
    (disabled ?? false) || startConnection.isPending || disconnect.isPending

  const connect = (provider: string | undefined) => {
    if (!appSlug || !instanceId || !provider) return
    startConnection.mutate({
      provider: provider as ConnectionProvider,
      appSlug,
      instanceId,
    })
  }

  if (!connectionId) {
    return (
      <Button
        type="button"
        variant="outline"
        className="w-full gap-1.5"
        disabled={busy || !wantedProvider || !instanceId}
        onClick={() => {
          connect(wantedProvider)
        }}
      >
        <PlugIcon className="size-4" />
        {t('apps.connections.connect')}
      </Button>
    )
  }

  // Connected — but to the other provider than the one the config now needs
  // (the operator flipped the source select). Offer a one-click switch.
  const mismatched =
    connection !== undefined &&
    wantedProvider !== undefined &&
    connection.provider !== wantedProvider

  const reconnect = () => {
    const provider = wantedProvider ?? connection?.provider
    if (!provider) return
    if (mismatched && instanceId) {
      // The old connection is bound to this instance; release it first, then
      // start the right provider's flow.
      disconnect.mutate(instanceId, {
        onSuccess: () => {
          connect(provider)
        },
      })
      return
    }
    connect(provider)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="border-quaternary flex items-center justify-between gap-2 rounded-md border px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <CheckCircle2Icon className="size-4 shrink-0 text-success" />
          <span className="text-primary truncate text-sm">
            {connection?.accountLabel ?? t('common.loading')}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5"
            disabled={busy}
            onClick={reconnect}
          >
            <RefreshCwIcon className="size-3.5" />
            {mismatched ? t('apps.connections.switch') : t('apps.connections.reconnect')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={busy || !instanceId}
            onClick={() => {
              if (instanceId) disconnect.mutate(instanceId)
            }}
            aria-label={t('apps.connections.disconnect')}
          >
            {disconnect.isPending ? (
              <PlugIcon className="size-3.5" />
            ) : (
              <XIcon className="size-3.5" />
            )}
          </Button>
        </div>
      </div>
      {mismatched ? (
        <p className="text-xs text-warning">{t('apps.connections.providerMismatch')}</p>
      ) : null}
    </div>
  )
}

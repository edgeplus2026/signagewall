import { CheckCircle2Icon, PlugIcon, RefreshCwIcon, XIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useAppSlug } from '@/features/apps/config-form/appSlugContext'
import type { FieldControlProps } from '@/features/apps/config-form/controls'
import { useInstanceId } from '@/features/apps/config-form/instanceIdContext'
import {
  useConnection,
  useDisconnectInstance,
  useStartConnection,
} from '@/features/apps/hooks/useConnections'

/**
 * Renders the `oauth` config field once an account is connected: shows which
 * account this instance is connected as and lets the operator reconnect (switch
 * account) or disconnect. The initial connect is handled by the page-level
 * centered prompt; this control only appears inside the form (connection set).
 * Per-instance: each action targets THIS instance's connection only.
 */
export function OAuthControl({ value, disabled }: FieldControlProps) {
  const { t } = useTranslation()
  const appSlug = useAppSlug()
  const instanceId = useInstanceId()
  const connectionId = typeof value === 'string' ? value : ''
  const { data: connection } = useConnection(connectionId || undefined)
  const startConnection = useStartConnection()
  const disconnect = useDisconnectInstance()

  const provider = connection?.provider
  const busy =
    (disabled ?? false) || startConnection.isPending || disconnect.isPending

  const reconnect = () => {
    if (!appSlug || !instanceId || !provider) return
    startConnection.mutate({
      provider: provider,
      appSlug,
      instanceId,
    })
  }

  return (
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
          {t('apps.connections.reconnect')}
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
  )
}

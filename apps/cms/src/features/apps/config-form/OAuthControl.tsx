import { PlugIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppSlug } from '@/features/apps/config-form/appSlugContext'
import type { FieldControlProps } from '@/features/apps/config-form/controls'
import {
  useConnections,
  useStartConnection,
} from '@/features/apps/hooks/useConnections'
import type { ConnectionProvider } from '@/features/apps/types/connection.types'

const PROVIDERS: { id: ConnectionProvider; label: string }[] = [
  { id: 'google', label: 'Google' },
  { id: 'microsoft', label: 'Microsoft' },
]

/**
 * Renders the `oauth` config field: pick a previously connected account, or
 * start an OAuth flow to connect a new one. The field value is the chosen
 * connection id. Starting a flow navigates the browser to the provider; on
 * return the connection callback page resolves it and the user re-opens the
 * config to select the new account.
 */
export function OAuthControl({
  id,
  value,
  onChange,
  onBlur,
  invalid,
  disabled,
}: FieldControlProps) {
  const { t } = useTranslation()
  const appSlug = useAppSlug()
  const { data: connections = [], isLoading } = useConnections()
  const startConnection = useStartConnection()

  const connect = (provider: ConnectionProvider) => {
    if (!appSlug) return
    startConnection.mutate({ provider, appSlug })
  }

  return (
    <div className="flex flex-col gap-2">
      <Select
        value={typeof value === 'string' ? value : ''}
        disabled={disabled ?? false}
        onValueChange={(next) => {
          onChange(next)
          onBlur()
        }}
      >
        <SelectTrigger id={id} aria-invalid={invalid} className="w-full">
          <SelectValue
            placeholder={
              isLoading
                ? t('common.loading')
                : t('apps.connections.selectAccount')
            }
          />
        </SelectTrigger>
        <SelectContent>
          {connections.map((connection) => (
            <SelectItem key={connection.id} value={connection.id}>
              {connection.accountLabel} ({connection.provider})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit gap-2"
            disabled={(disabled ?? false) || startConnection.isPending}
          >
            <PlugIcon className="size-3.5" />
            {t('apps.connections.connectAccount')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {PROVIDERS.map((provider) => (
            <DropdownMenuItem
              key={provider.id}
              onClick={() => {
                connect(provider.id)
              }}
            >
              {provider.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

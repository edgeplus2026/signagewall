import { CheckIcon, DownloadIcon, InfoIcon, MoreHorizontalIcon, Trash2Icon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AppIcon } from '@/features/apps/components/AppIcon'
import { useInstallApp } from '@/features/apps/hooks/useApps'
import { appTagline } from '@/features/apps/lib/appCopy'
import type { EdgeApp } from '@/features/apps/types/app.types'
import { cn } from '@/lib/utils'

interface AppCardProps {
  app: EdgeApp
  /** Opens the app drawer (details + its saved setups). */
  onShowDetails: (app: EdgeApp) => void
  /** Requests uninstall confirmation for the app. */
  onRequestUninstall: (app: EdgeApp) => void
}

export function AppCard({ app, onShowDetails, onRequestUninstall }: AppCardProps) {
  const { t } = useTranslation()
  const installApp = useInstallApp()

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        onShowDetails(app)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onShowDetails(app)
        }
      }}
      className={cn(
        'group bg-panel ring-quaternary relative flex cursor-pointer flex-col gap-5 overflow-hidden rounded-2xl p-5 text-left ring-1 transition',
        'hover:ring-tertiary hover:-translate-y-0.5',
        'focus-visible:ring-brand focus-visible:ring-2 focus-visible:outline-none',
      )}
    >
      <div className="relative flex items-start justify-between gap-3">
        <AppIcon
          iconSvg={app.iconSvg}
          color={app.color}
          className="size-12 rounded-2xl shadow-md"
        />

        <div className="flex items-center gap-2">
          {app.isInstalled ? (
            <span className="bg-success/10 text-success inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium">
              <CheckIcon className="size-3" />
              {t('apps.installed')}
            </span>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-secondary shrink-0"
                onClick={(event) => {
                  event.stopPropagation()
                }}
              >
                <MoreHorizontalIcon />
                <span className="sr-only">{t('common.actions')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-auto min-w-44"
              onClick={(event) => {
                event.stopPropagation()
              }}
            >
              <DropdownMenuItem
                onClick={() => {
                  onShowDetails(app)
                }}
              >
                <InfoIcon />
                {t('apps.actions.appDetails')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {app.isInstalled ? (
                <DropdownMenuItem
                  variant="danger"
                  onClick={() => {
                    onRequestUninstall(app)
                  }}
                >
                  <Trash2Icon />
                  {t('apps.actions.uninstall')}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => {
                    installApp.mutate(app.id, {
                      onSuccess: () => {
                        onShowDetails(app)
                      },
                    })
                  }}
                >
                  <DownloadIcon />
                  {t('apps.actions.install')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="relative flex flex-col gap-1.5">
        <h3 className="text-primary text-base font-semibold">{app.name}</h3>
        <p className="text-secondary line-clamp-2 text-sm">{appTagline(t, app.slug)}</p>
      </div>
    </div>
  )
}

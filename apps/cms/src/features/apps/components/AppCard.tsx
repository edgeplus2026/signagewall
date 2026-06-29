import {
  CheckIcon,
  DownloadIcon,
  InfoIcon,
  MoreHorizontalIcon,
  Trash2Icon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

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
import { resolveAppColor } from '@/features/apps/lib/appColor'
import type { EdgeApp } from '@/features/apps/types/app.types'
import { cn } from '@/lib/utils'

interface AppCardProps {
  app: EdgeApp
  /** Opens the "App details" drawer. */
  onShowDetails: (app: EdgeApp) => void
  /** Requests uninstall confirmation for the app. */
  onRequestUninstall: (app: EdgeApp) => void
}

export function AppCard({ app, onShowDetails, onRequestUninstall }: AppCardProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const installApp = useInstallApp()

  const handleActivate = () => {
    if (app.isInstalled) {
      void navigate(`/apps/${app.id}/instances`)
    } else {
      onShowDetails(app)
    }
  }

  const brandColor = resolveAppColor(app.color)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleActivate}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          handleActivate()
        }
      }}
      className={cn(
        'group relative flex cursor-pointer flex-col gap-5 overflow-hidden rounded-2xl bg-panel p-5 text-left ring-1 ring-quaternary transition',
        'hover:-translate-y-0.5 hover:shadow-lg hover:ring-tertiary',
        'focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none',
      )}
    >
      {/* Strong inner glow in the app's brand colour, anchored to the bottom. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-36 opacity-60 blur-2xl transition-opacity duration-300 group-hover:opacity-90"
        style={{
          background: `radial-gradient(120% 80% at 50% 130%, ${brandColor}, transparent 70%)`,
        }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <AppIcon
          iconSvg={app.iconSvg}
          color={app.color}
          className="size-14 rounded-2xl shadow-md"
        />

        <div className="flex items-center gap-2">
          {app.isInstalled ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
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
                className="shrink-0 text-secondary"
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
                        void navigate(`/apps/${app.id}/instances`)
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
        <h3 className="text-base font-semibold text-primary">{app.name}</h3>
        <p className="line-clamp-2 text-sm text-secondary">{app.tagline}</p>
      </div>
    </div>
  )
}

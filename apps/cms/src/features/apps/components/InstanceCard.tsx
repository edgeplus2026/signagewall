import { MoreHorizontalIcon, PencilIcon, Trash2Icon, UploadIcon } from 'lucide-react'
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
import { resolveAppColor } from '@/features/apps/lib/appColor'
import type { AppInstance, EdgeApp } from '@/features/apps/types/app.types'
import { cn } from '@/lib/utils'

interface InstanceCardProps {
  app: EdgeApp
  instance: AppInstance
  onRename: (instance: AppInstance) => void
  onDelete: (instance: AppInstance) => void
}

export function InstanceCard({ app, instance, onRename, onDelete }: InstanceCardProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const open = () => {
    void navigate(`/apps/${app.id}/instances/${instance.id}`)
  }

  const brandColor = resolveAppColor(app.color)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          open()
        }
      }}
      className={cn(
        'group relative flex cursor-pointer flex-col gap-4 overflow-hidden rounded-2xl bg-panel p-4 ring-1 ring-quaternary transition',
        'hover:-translate-y-0.5 hover:shadow-lg hover:ring-tertiary',
        'focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none',
      )}
    >
      {/* Strong inner glow in the app's brand colour, anchored to the bottom. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 opacity-40 blur-2xl transition-opacity duration-300 group-hover:opacity-70"
        style={{
          background: `radial-gradient(120% 80% at 50% 130%, ${brandColor}, transparent 70%)`,
        }}
      />

      <div className="relative flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <AppIcon iconSvg={app.iconSvg} color={app.color} className="size-9 rounded-lg" />
          <div className="flex min-w-0 flex-col">
            <p className="truncate text-sm font-medium text-primary">{instance.name}</p>
            <p className="truncate text-xs text-secondary">{app.name}</p>
          </div>
        </div>

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
                onRename(instance)
              }}
            >
              <PencilIcon />
              {t('apps.instances.actions.rename')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={open}>
              <UploadIcon />
              {t('apps.instances.actions.update')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="danger"
              onClick={() => {
                onDelete(instance)
              }}
            >
              <Trash2Icon />
              {t('apps.instances.actions.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

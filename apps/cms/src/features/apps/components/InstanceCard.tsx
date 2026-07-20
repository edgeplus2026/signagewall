import {
  MoreHorizontalIcon,
  PencilIcon,
  SlidersHorizontalIcon,
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
import type { AppInstance, EdgeApp } from '@/features/apps/types/app.types'

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

  return (
    <article className="group relative flex h-full min-w-[11rem] flex-col overflow-hidden rounded-xl border border-secondary bg-panel transition-colors">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-2 right-2 z-10 bg-panel opacity-0 group-hover:opacity-100"
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
          <DropdownMenuItem onClick={open}>
            <SlidersHorizontalIcon />
            {t('apps.instances.actions.update')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              onRename(instance)
            }}
          >
            <PencilIcon />
            {t('apps.instances.actions.rename')}
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

      <button
        type="button"
        className="flex min-h-0 flex-1 cursor-pointer flex-col text-left"
        onClick={open}
      >
        <div className="bg-sidebar relative flex aspect-4/3 w-full shrink-0 items-center justify-center overflow-hidden">
          <AppIcon
            iconSvg={app.iconSvg}
            color={app.color}
            className="size-16 rounded-2xl shadow-md"
          />
        </div>

        <div className="flex h-[5.5rem] shrink-0 flex-col gap-1.5 p-2.5">
          <p
            className="line-clamp-2 overflow-hidden text-sm/5 font-medium break-words"
            title={instance.name}
          >
            {instance.name}
          </p>
        </div>
      </button>
    </article>
  )
}

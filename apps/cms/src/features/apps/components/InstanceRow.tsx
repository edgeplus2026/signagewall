import { MoreHorizontalIcon, PencilIcon, SlidersHorizontalIcon, Trash2Icon } from 'lucide-react'
import { useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { AppIcon } from '@/features/apps/components/AppIcon'
import { AppDrawerNestedOverlayContext } from '@/features/apps/components/appDrawerNestedContext'
import { useRenameInstance } from '@/features/apps/hooks/useApps'
import type { AppInstance, CatalogApp } from '@/features/apps/types/app.types'
import { getApiErrorMessage } from '@/lib/api-error'

interface InstanceRowProps {
  app: CatalogApp
  instance: AppInstance
  /** Requests delete confirmation — the dialog lives in the parent section. */
  onRequestDelete: (instance: AppInstance) => void
}

/**
 * One configured copy of an app, rendered as a compact list row inside the app
 * drawer (deliberately lighter than the media/app cards used elsewhere). The row
 * opens the full-page config editor; renaming happens inline. No duplicate.
 */
export function InstanceRow({ app, instance, onRequestDelete }: InstanceRowProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const renameInstance = useRenameInstance()
  const registerNestedOverlay = useContext(AppDrawerNestedOverlayContext)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(instance.name)

  const open = () => {
    void navigate(`/apps/${app.id}/instances/${instance.id}`)
  }

  const startRename = () => {
    setDraft(instance.name)
    setEditing(true)
  }

  const commitRename = () => {
    const trimmed = draft.trim()
    setEditing(false)
    if (trimmed.length === 0 || trimmed === instance.name) return
    renameInstance.mutate(
      { id: instance.id, name: trimmed },
      {
        onError: (error) => {
          toast.error(getApiErrorMessage(error, t('apps.instances.rename.error')))
        },
      },
    )
  }

  return (
    <div className="group hover:bg-highlight/50 flex items-center gap-2.5 px-2.5 py-1.5 transition-colors">
      {editing ? (
        <>
          <AppIcon
            iconSvg={app.iconSvg}
            color={app.color}
            className="size-8 shrink-0 rounded-md shadow-sm"
          />
          <Input
            autoFocus
            value={draft}
            aria-label={t('apps.instances.rename.label')}
            className="h-7 flex-1 px-2 text-sm"
            disabled={renameInstance.isPending}
            onChange={(event) => {
              setDraft(event.target.value)
            }}
            onBlur={commitRename}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                commitRename()
              } else if (event.key === 'Escape') {
                event.preventDefault()
                setEditing(false)
              }
            }}
          />
        </>
      ) : (
        <>
          <button
            type="button"
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left"
            onClick={open}
          >
            <AppIcon
              iconSvg={app.iconSvg}
              color={app.color}
              className="size-8 shrink-0 rounded-md shadow-sm"
            />
            <span className="text-primary truncate text-sm font-medium" title={instance.name}>
              {instance.name}
            </span>
          </button>

          <DropdownMenu onOpenChange={registerNestedOverlay}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-secondary size-7 shrink-0 transition-opacity max-sm:opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
              >
                <MoreHorizontalIcon />
                <span className="sr-only">{t('common.actions')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-auto min-w-44">
              <DropdownMenuItem onClick={open}>
                <SlidersHorizontalIcon />
                {t('apps.instances.actions.update')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={startRename}>
                <PencilIcon />
                {t('apps.instances.actions.rename')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="danger"
                onClick={() => {
                  onRequestDelete(instance)
                }}
              >
                <Trash2Icon />
                {t('apps.instances.actions.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </div>
  )
}

import {
  CopyIcon,
  ListVideoIcon,
  MonitorIcon,
  MoreHorizontalIcon,
  Trash2Icon,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { FullPageLoader } from '@/components/common/FullPageLoader'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AppInstanceConfigSidebar } from '@/features/apps/components/AppInstanceConfigSidebar'
import { AppInstanceScreen } from '@/features/apps/components/AppInstanceScreen'
import { AppLivePreview } from '@/features/apps/components/AppLivePreview'
import { AppsBreadcrumb } from '@/features/apps/components/AppsBreadcrumb'
import { DeleteInstanceDialog } from '@/features/apps/components/DeleteInstanceDialog'
import {
  useApp,
  useAppInstance,
  useDuplicateInstance,
  useUpdateInstanceConfig,
} from '@/features/apps/hooks/useApps'
import type { AppInstanceConfig } from '@/features/apps/types/app.types'
import { getApiErrorMessage } from '@/lib/api-error'

function configEquals(a: AppInstanceConfig, b: AppInstanceConfig) {
  return JSON.stringify(a) === JSON.stringify(b)
}

export default function AppInstanceConfigPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { appId, instanceId } = useParams<{ appId: string; instanceId: string }>()
  const { data: app, isLoading: appLoading } = useApp(appId)
  const { data: instance, isLoading: instanceLoading } = useAppInstance(instanceId)

  const updateInstanceConfig = useUpdateInstanceConfig()
  const duplicateInstance = useDuplicateInstance()

  const [draft, setDraft] = useState<AppInstanceConfig | null>(
    instance ? { ...instance.config } : null,
  )
  const [deleteOpen, setDeleteOpen] = useState(false)

  // Reset the local draft when navigating between instances — adjusting state
  // during render (React's recommended alternative to an effect).
  const [lastInstanceId, setLastInstanceId] = useState(instance?.id ?? null)
  if ((instance?.id ?? null) !== lastInstanceId) {
    setLastInstanceId(instance?.id ?? null)
    setDraft(instance ? { ...instance.config } : null)
  }

  if (appLoading || instanceLoading) {
    return <FullPageLoader />
  }

  if (!app?.isInstalled || !instance) {
    return <Navigate to={app ? `/apps/${app.id}/instances` : '/apps'} replace />
  }

  const activeDraft = draft ?? instance.config
  const isDirty = !configEquals(activeDraft, instance.config)

  const handleSave = () => {
    updateInstanceConfig.mutate(
      { id: instance.id, config: activeDraft },
      {
        onSuccess: () => {
          toast.success(t('apps.instances.config.saved'))
        },
        onError: (error) => {
          toast.error(getApiErrorMessage(error, t('apps.instances.config.saveError')))
        },
      },
    )
  }

  const handleDuplicate = () => {
    duplicateInstance.mutate(instance.id, {
      onSuccess: (copy) => {
        toast.success(t('apps.instances.config.duplicated'))
        void navigate(`/apps/${app.id}/instances/${copy.id}`)
      },
    })
  }

  return (
    <>
      <AppsBreadcrumb app={app} instanceName={instance.name} />

      <div className="flex h-[calc(100dvh-5.5rem)] w-full min-w-0 flex-col gap-4 lg:px-10">
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pb-4 lg:flex-row lg:gap-8">
          <AppInstanceConfigSidebar
            app={app}
            instanceId={instance.id}
            config={activeDraft}
            onConfigChange={setDraft}
          />

          <div className="flex min-w-0 flex-1 items-center justify-center">
            <AppLivePreview glow={app.accent.glow}>
              <AppInstanceScreen app={app} config={activeDraft} />
            </AppLivePreview>
          </div>
        </div>

        {/* Sticky save bar */}
        <div className="border-secondary flex shrink-0 items-center justify-end gap-2 border-t pt-3">
          <Button
            type="button"
            disabled={!isDirty || updateInstanceConfig.isPending}
            onClick={handleSave}
          >
            {t('apps.instances.config.save')}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="icon-sm" className="size-9 shrink-0">
                <MoreHorizontalIcon />
                <span className="sr-only">{t('common.actions')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-auto min-w-52">
              <DropdownMenuItem
                onClick={() => {
                  toast.info(t('apps.instances.config.actions.addToScreenSoon'))
                }}
              >
                <MonitorIcon />
                {t('apps.instances.config.actions.addToScreen')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  toast.info(t('apps.instances.config.actions.addToPlaylistSoon'))
                }}
              >
                <ListVideoIcon />
                {t('apps.instances.config.actions.addToPlaylist')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDuplicate}>
                <CopyIcon />
                {t('apps.instances.config.actions.duplicate')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="danger"
                onClick={() => {
                  setDeleteOpen(true)
                }}
              >
                <Trash2Icon />
                {t('apps.instances.config.actions.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <DeleteInstanceDialog
        instance={instance}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => {
          void navigate(`/apps/${app.id}/instances`)
        }}
      />
    </>
  )
}

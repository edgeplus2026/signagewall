import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams } from 'react-router-dom'

import { FullPageLoader } from '@/components/common/FullPageLoader'
import { AppsBreadcrumb } from '@/features/apps/components/AppsBreadcrumb'
import { CreateInstanceCard } from '@/features/apps/components/CreateInstanceCard'
import { DeleteInstanceDialog } from '@/features/apps/components/DeleteInstanceDialog'
import { InstanceCard } from '@/features/apps/components/InstanceCard'
import { RenameInstanceDialog } from '@/features/apps/components/RenameInstanceDialog'
import { useApp, useAppInstances, useCreateInstance } from '@/features/apps/hooks/useApps'
import type { AppInstance } from '@/features/apps/types/app.types'

export default function AppInstancesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { appId } = useParams<{ appId: string }>()
  const { data: app, isLoading: appLoading } = useApp(appId)
  const { data: instances = [] } = useAppInstances(appId)
  const createInstance = useCreateInstance()

  const [renameTarget, setRenameTarget] = useState<AppInstance | null>(null)
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AppInstance | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (appLoading) {
    return <FullPageLoader />
  }

  // Only installed apps have an instances page.
  if (!app?.isInstalled) {
    return <Navigate to="/apps" replace />
  }

  const handleCreate = () => {
    createInstance.mutate(
      { appId: app.id },
      {
        onSuccess: (instance) => {
          void navigate(`/apps/${app.id}/instances/${instance.id}`)
        },
      },
    )
  }

  const handleRename = (instance: AppInstance) => {
    setRenameTarget(instance)
    setRenameOpen(true)
  }

  const handleDelete = (instance: AppInstance) => {
    setDeleteTarget(instance)
    setDeleteOpen(true)
  }

  return (
    <>
      <AppsBreadcrumb app={app} />

      <div className="flex w-full min-w-0 flex-col gap-7 lg:px-10">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-primary text-xl font-medium tracking-tight">{app.name}</h1>
            <span className="bg-brand/10 text-brand inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium">
              {t('apps.instances.count', { count: instances.length })}
            </span>
          </div>
          <p className="text-secondary text-sm">{t('apps.instances.description')}</p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <CreateInstanceCard onClick={handleCreate} />
          {instances.map((instance) => (
            <InstanceCard
              key={instance.id}
              app={app}
              instance={instance}
              onRename={handleRename}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>

      <RenameInstanceDialog
        instance={renameTarget}
        open={renameOpen}
        onOpenChange={setRenameOpen}
      />

      <DeleteInstanceDialog
        instance={deleteTarget}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  )
}

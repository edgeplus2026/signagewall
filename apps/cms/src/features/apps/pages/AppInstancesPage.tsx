import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams } from 'react-router-dom'

import { Skeleton } from '@/components/ui/skeleton'
import { AppsBreadcrumb } from '@/features/apps/components/AppsBreadcrumb'
import { CreateInstanceCard } from '@/features/apps/components/CreateInstanceCard'
import { DeleteInstanceDialog } from '@/features/apps/components/DeleteInstanceDialog'
import { InstanceCard } from '@/features/apps/components/InstanceCard'
import { RenameInstanceSheet } from '@/features/apps/components/RenameInstanceSheet'
import { useApp, useAppInstances, useCreateInstance } from '@/features/apps/hooks/useApps'
import type { AppInstance } from '@/features/apps/types/app.types'
import { mediaGridClassName } from '@/features/media/lib/mediaActionCardStyles'

function InstanceCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-secondary bg-panel">
      <Skeleton className="aspect-4/3 w-full rounded-none" />
      <div className="flex h-[5.5rem] flex-col gap-2 p-2.5">
        <Skeleton className="h-4 w-2/3 rounded-md" />
        <Skeleton className="h-3 w-1/3 rounded-md" />
      </div>
    </div>
  )
}

export default function AppInstancesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { appId } = useParams<{ appId: string }>()
  const { data: app, isLoading: appLoading } = useApp(appId)
  const { data: instances = [], isLoading: instancesLoading } = useAppInstances(appId)
  const createInstance = useCreateInstance()

  const [renameTarget, setRenameTarget] = useState<AppInstance | null>(null)
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AppInstance | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const loading = appLoading || instancesLoading

  // Skeleton state — render the page shell with placeholder cards rather than a
  // blank full-page loader, so the layout doesn't pop in once data arrives.
  if (loading) {
    return (
      <div className="flex w-full min-w-0 flex-col gap-7 lg:px-10">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-48 rounded-md" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <div className={mediaGridClassName}>
          {Array.from({ length: 4 }).map((_, index) => (
            <InstanceCardSkeleton key={index} />
          ))}
        </div>
      </div>
    )
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
            <span className="bg-success/10 text-success inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium">
              {t('apps.instances.count', { count: instances.length })}
            </span>
          </div>
          <p className="text-secondary text-sm">
            {t('apps.instances.description', { app: app.name })}
          </p>
        </div>

        <div className={mediaGridClassName}>
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

      <RenameInstanceSheet
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

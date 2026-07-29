import { PlusIcon } from 'lucide-react'
import { useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { Skeleton } from '@/components/ui/skeleton'
import { DeleteInstanceDialog } from '@/features/apps/components/DeleteInstanceDialog'
import { InstanceRow } from '@/features/apps/components/InstanceRow'
import { AppDrawerNestedOverlayContext } from '@/features/apps/components/appDrawerNestedContext'
import { useAppInstances, useCreateInstance } from '@/features/apps/hooks/useApps'
import { appItemNoun } from '@/features/apps/lib/appCopy'
import type { AppInstance, CatalogApp } from '@/features/apps/types/app.types'

interface AppInstancesSectionProps {
  app: CatalogApp
}

/**
 * The "your setups" block inside the app drawer: a plain-language line about what
 * a saved copy is, then a compact list (create-row first). This replaces the old
 * standalone `/apps/:appId/instances` page — the list lives with the app it
 * belongs to, while opening a row still routes to the full-page config editor.
 */
export function AppInstancesSection({ app }: AppInstancesSectionProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: instances = [], isLoading } = useAppInstances(app.id)
  const createInstance = useCreateInstance()
  const registerNestedOverlay = useContext(AppDrawerNestedOverlayContext)

  const [deleteTarget, setDeleteTarget] = useState<AppInstance | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const noun = appItemNoun(t, app.slug)
  const nounPlural = appItemNoun(t, app.slug, true)

  const handleCreate = () => {
    if (createInstance.isPending) return
    createInstance.mutate(
      { appId: app.id },
      {
        onSuccess: (instance) => {
          void navigate(`/apps/${app.id}/instances/${instance.id}`)
        },
      },
    )
  }

  const requestDelete = (instance: AppInstance) => {
    setDeleteTarget(instance)
    setDeleteOpen(true)
    // Keep the drawer's dismiss disabled while the confirm dialog is up.
    registerNestedOverlay(true)
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h3 className="text-primary text-sm font-semibold capitalize">{nounPlural}</h3>
          {isLoading ? null : (
            <span className="bg-quaternary text-secondary rounded-md px-1.5 py-0.5 text-[11px] font-medium">
              {instances.length}
            </span>
          )}
        </div>
        <p className="text-secondary max-w-prose text-xs leading-relaxed">
          {app.overlay
            ? t('apps.instances.overlayNote')
            : t('apps.instances.explain', { app: app.name })}
        </p>
      </div>

      <div className="border-secondary divide-secondary divide-y overflow-hidden rounded-xl border">
        <button
          type="button"
          className="text-brand hover:bg-highlight/50 flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition-colors disabled:opacity-60"
          onClick={handleCreate}
          disabled={createInstance.isPending}
        >
          <span className="border-brand/40 flex size-8 shrink-0 items-center justify-center rounded-md border border-dashed">
            <PlusIcon className="size-4" />
          </span>
          <span className="text-sm font-medium">{t('apps.instances.newItem', { noun })}</span>
        </button>

        {isLoading
          ? Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="flex items-center gap-2.5 px-2.5 py-1.5">
                <Skeleton className="size-8 shrink-0 rounded-md" />
                <Skeleton className="h-4 w-40 rounded-md" />
              </div>
            ))
          : instances.map((instance) => (
              <InstanceRow
                key={instance.id}
                app={app}
                instance={instance}
                onRequestDelete={requestDelete}
              />
            ))}
      </div>

      <DeleteInstanceDialog
        instance={deleteTarget}
        open={deleteOpen}
        onOpenChange={(next) => {
          setDeleteOpen(next)
          if (!next) registerNestedOverlay(false)
        }}
      />
    </section>
  )
}

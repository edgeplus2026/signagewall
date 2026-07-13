import { buildConfigZod, buildDefaultConfig } from '@edge/apps-contract'
import {
  ListVideoIcon,
  MonitorIcon,
  MoreHorizontalIcon,
  Trash2Icon,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import { toast } from 'sonner'


import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { AppInstanceConfigSidebar } from '@/features/apps/components/AppInstanceConfigSidebar'
import { AppInstanceScreen } from '@/features/apps/components/AppInstanceScreen'
import { AppLivePreview } from '@/features/apps/components/AppLivePreview'
import { AppsBreadcrumb } from '@/features/apps/components/AppsBreadcrumb'
import { ConnectAppPrompt } from '@/features/apps/components/ConnectAppPrompt'
import { DeleteInstanceDialog } from '@/features/apps/components/DeleteInstanceDialog'
import {
  useApp,
  useAppInstance,
  useRenameInstance,
  useUpdateInstanceConfig,
} from '@/features/apps/hooks/useApps'
import { needsConnection } from '@/features/apps/lib/connectedApp'
import type { AppInstanceConfig } from '@/features/apps/types/app.types'
import { AddToPlaylistSheet } from '@/features/playlists/components/AddToPlaylistSheet'
import { AddToScreenSheet } from '@/features/screens/components/AddToScreenSheet'
import { getApiErrorMessage } from '@/lib/api-error'

/** Order-independent shallow compare of config values (primitives + arrays). */
function configEquals(a: AppInstanceConfig, b: AppInstanceConfig) {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  return aKeys.every((key) => {
    const av = a[key]
    const bv = b[key]
    if (Array.isArray(av) && Array.isArray(bv)) {
      return av.length === bv.length && av.every((item, i) => item === bv[i])
    }
    return av === bv
  })
}

export default function AppInstanceConfigPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { appId, instanceId } = useParams<{ appId: string; instanceId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: app, isLoading: appLoading } = useApp(appId)
  const { data: instance, isLoading: instanceLoading } = useAppInstance(instanceId)

  // Toast the OAuth connect outcome the backend redirected back with, then strip
  // the query params so a refresh doesn't re-toast.
  useEffect(() => {
    const connected = searchParams.get('connected')
    const connectError = searchParams.get('connect_error')
    if (!connected && !connectError) return
    if (connected) {
      toast.success(
        t('apps.connections.connectedToast', {
          account: searchParams.get('account') ?? '',
        }),
      )
    } else {
      toast.error(t('apps.connections.connectErrorToast'))
    }
    const next = new URLSearchParams(searchParams)
    next.delete('connected')
    next.delete('connect_error')
    next.delete('account')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams, t])

  const updateInstanceConfig = useUpdateInstanceConfig()
  const renameInstance = useRenameInstance()

  // `draft`/`nameDraft` hold only the operator's edits; they're null until the
  // form is touched, then compared against `baseline` to track dirtiness.
  const [draft, setDraft] = useState<AppInstanceConfig | null>(null)
  const [nameDraft, setNameDraft] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [addToScreenOpen, setAddToScreenOpen] = useState(false)
  const [addToPlaylistOpen, setAddToPlaylistOpen] = useState(false)

  // The saved config with the schema defaults merged in, so newly added fields
  // (e.g. after an app upgrade) render with their defaults instead of blank — and
  // dirtiness is measured against that, not the raw stored config.
  const baseline = useMemo<AppInstanceConfig>(
    () =>
      app && instance
        ? { ...buildDefaultConfig(app.configSchema), ...instance.config }
        : {},
    [app, instance],
  )

  // Reset the local drafts when navigating between instances — adjusting state
  // during render (React's recommended alternative to an effect).
  const [lastInstanceId, setLastInstanceId] = useState(instance?.id ?? null)
  if ((instance?.id ?? null) !== lastInstanceId) {
    setLastInstanceId(instance?.id ?? null)
    setDraft(null)
    setNameDraft(null)
  }

  if (appLoading || instanceLoading) {
    return (
      <div className="flex h-[calc(100dvh-5.5rem)] w-full min-w-0 flex-col gap-4 lg:px-10">
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden pb-4 lg:flex-row lg:gap-8">
          {/* Config sidebar */}
          <div className="flex w-full flex-col gap-6 lg:w-96 lg:shrink-0">
            <div className="flex items-start gap-3">
              <Skeleton className="size-12 shrink-0 rounded-xl" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-2/3 rounded-md" />
                <Skeleton className="h-3 w-4/5 rounded-md" />
              </div>
            </div>
            <div className="flex flex-col gap-5">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex flex-col gap-2">
                  <Skeleton className="h-3.5 w-24 rounded-md" />
                  <Skeleton className="h-9 w-full rounded-md" />
                </div>
              ))}
            </div>
          </div>

          {/* Live preview */}
          <div className="flex min-w-0 flex-1 items-center justify-center">
            <div className="flex w-full max-w-xl flex-col items-center gap-3">
              <Skeleton className="aspect-video w-full rounded-2xl" />
              <Skeleton className="h-6 w-16 rounded-b-md" />
              <Skeleton className="h-2.5 w-44 rounded-full" />
            </div>
          </div>
        </div>

        {/* Save bar */}
        <div className="border-secondary flex shrink-0 items-center justify-end gap-2 border-t pt-3">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="size-9 rounded-md" />
        </div>
      </div>
    )
  }

  if (!app?.isInstalled || !instance) {
    return <Navigate to={app ? `/apps/${app.id}/instances` : '/apps'} replace />
  }

  // A `connected` app with no account yet: show only the centered connect prompt
  // (no config form / preview / save bar) until an account is connected.
  if (needsConnection(app, baseline)) {
    return (
      <>
        <AppsBreadcrumb app={app} instanceName={instance.name} />
        <div className="flex h-[calc(100dvh-5.5rem)] w-full min-w-0 flex-col lg:px-10">
          <ConnectAppPrompt app={app} instanceId={instance.id} />
        </div>
      </>
    )
  }

  const activeDraft = draft ?? baseline
  const activeName = nameDraft ?? instance.name
  const trimmedName = activeName.trim()

  const isConfigDirty = !configEquals(activeDraft, baseline)
  const isNameDirty = trimmedName !== instance.name
  const isDirty = isConfigDirty || isNameDirty

  const isConfigValid = buildConfigZod(app.configSchema, activeDraft).safeParse(
    activeDraft,
  ).success
  const isValid = isConfigValid && trimmedName.length > 0

  const isSaving = updateInstanceConfig.isPending || renameInstance.isPending

  const handleSave = async () => {
    try {
      // Persist whichever drafts changed. Rename is CMS-only; the config update
      // is what triggers the live player push (see AppInstanceChanged event).
      if (isNameDirty) {
        await renameInstance.mutateAsync({ id: instance.id, name: trimmedName })
      }
      if (isConfigDirty) {
        await updateInstanceConfig.mutateAsync({ id: instance.id, config: activeDraft })
      }
      toast.success(t('apps.instances.config.saved'))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('apps.instances.config.saveError')))
    }
  }

  return (
    <>
      <AppsBreadcrumb app={app} instanceName={instance.name} />

      <div className="flex h-[calc(100dvh-5.5rem)] w-full min-w-0 flex-col gap-4 lg:px-10">
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pb-4 lg:flex-row lg:gap-8">
          <AppInstanceConfigSidebar
            app={app}
            instanceId={instance.id}
            name={activeName}
            onNameChange={setNameDraft}
            config={activeDraft}
            onConfigChange={setDraft}
          />

          <div className="flex min-w-0 flex-1 items-center justify-center">
            <AppLivePreview color={app.color}>
              <AppInstanceScreen app={app} config={activeDraft} />
            </AppLivePreview>
          </div>
        </div>

        {/* Sticky save bar */}
        <div className="border-secondary flex shrink-0 items-center justify-end gap-2 border-t pt-3">
          <Button
            type="button"
            disabled={!isDirty || !isValid || isSaving}
            onClick={() => {
              void handleSave()
            }}
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
                  setAddToScreenOpen(true)
                }}
              >
                <MonitorIcon />
                {t('apps.instances.config.actions.addToScreen')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setAddToPlaylistOpen(true)
                }}
              >
                <ListVideoIcon />
                {t('apps.instances.config.actions.addToPlaylist')}
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

      <AddToScreenSheet
        open={addToScreenOpen}
        onOpenChange={setAddToScreenOpen}
        mode="apps"
        appInstanceIds={[instance.id]}
      />

      <AddToPlaylistSheet
        open={addToPlaylistOpen}
        onOpenChange={setAddToPlaylistOpen}
        appInstanceIds={[instance.id]}
      />
    </>
  )
}

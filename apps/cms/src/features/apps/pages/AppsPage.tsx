import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AppDrawer } from '@/features/apps/components/AppDrawer'
import { AppGrid } from '@/features/apps/components/AppGrid'
import { UninstallAppDialog } from '@/features/apps/components/UninstallAppDialog'
import { useApp, useApps } from '@/features/apps/hooks/useApps'
import type { EdgeApp } from '@/features/apps/types/app.types'

type AppsTab = 'store' | 'my-apps'

function getActiveTab(tab: string | null): AppsTab {
  return tab === 'my-apps' ? 'my-apps' : 'store'
}

export default function AppsPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = getActiveTab(searchParams.get('tab'))

  const { data: apps = [], isLoading } = useApps()
  const myApps = useMemo(() => apps.filter((app) => app.isInstalled), [apps])

  // The open app drawer is driven by `?app=<id>` so it survives navigating into
  // the config editor and back (the editor links back with the same param).
  const drawerAppId = searchParams.get('app')
  const appFromList = apps.find((app) => app.id === drawerAppId)
  // Fall back to a direct fetch for an installed app that's no longer public and
  // thus missing from the catalog list.
  const { data: fetchedApp } = useApp(appFromList ? undefined : (drawerAppId ?? undefined))
  const drawerApp = appFromList ?? fetchedApp ?? null

  const [uninstallApp, setUninstallApp] = useState<EdgeApp | null>(null)
  const [uninstallOpen, setUninstallOpen] = useState(false)

  const setAppParam = (appId: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (appId === null) {
      next.delete('app')
    } else {
      next.set('app', appId)
    }
    setSearchParams(next)
  }

  const handleRequestUninstall = (app: EdgeApp) => {
    // Leave the app's drawer before confirming, so the dialog stands on its own.
    setAppParam(null)
    setUninstallApp(app)
    setUninstallOpen(true)
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-7 lg:px-10">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-primary text-xl font-medium tracking-tight">{t('apps.title')}</h1>
          <span className="bg-success/10 text-success inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium">
            {t('apps.count', { count: apps.length })}
          </span>
        </div>
        <p className="text-secondary text-sm">{t('apps.description')}</p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          if (value === 'store') {
            setSearchParams({})
          } else {
            setSearchParams({ tab: value })
          }
        }}
        className="flex flex-col gap-7"
      >
        <TabsList variant="line" className="w-fit shrink-0">
          <TabsTrigger value="store">
            {t('apps.tabs.store')}
            <span className="bg-quaternary text-secondary ml-2 inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium">
              {apps.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="my-apps">
            {t('apps.tabs.myApps')}
            <span className="bg-quaternary text-secondary ml-2 inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium">
              {myApps.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="store" className="mt-0">
          <AppGrid
            apps={apps}
            isLoading={isLoading}
            emptyTitle={t('apps.empty.store.title')}
            emptyDescription={t('apps.empty.store.description')}
            onShowDetails={(app) => {
              setAppParam(app.id)
            }}
            onRequestUninstall={handleRequestUninstall}
          />
        </TabsContent>

        <TabsContent value="my-apps" className="mt-0">
          <AppGrid
            apps={myApps}
            isLoading={isLoading}
            emptyTitle={t('apps.empty.myApps.title')}
            emptyDescription={t('apps.empty.myApps.description')}
            onShowDetails={(app) => {
              setAppParam(app.id)
            }}
            onRequestUninstall={handleRequestUninstall}
          />
        </TabsContent>
      </Tabs>

      <AppDrawer
        app={drawerApp}
        open={Boolean(drawerApp)}
        onOpenChange={(open) => {
          if (!open) setAppParam(null)
        }}
        onRequestUninstall={handleRequestUninstall}
      />

      <UninstallAppDialog app={uninstallApp} open={uninstallOpen} onOpenChange={setUninstallOpen} />
    </div>
  )
}

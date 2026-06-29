import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AppDetailDrawer } from '@/features/apps/components/AppDetailDrawer'
import { AppGrid } from '@/features/apps/components/AppGrid'
import { UninstallAppDialog } from '@/features/apps/components/UninstallAppDialog'
import { useApps } from '@/features/apps/hooks/useApps'
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

  const [detailsApp, setDetailsApp] = useState<EdgeApp | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [uninstallApp, setUninstallApp] = useState<EdgeApp | null>(null)
  const [uninstallOpen, setUninstallOpen] = useState(false)

  const handleShowDetails = (app: EdgeApp) => {
    setDetailsApp(app)
    setDrawerOpen(true)
  }

  const handleRequestUninstall = (app: EdgeApp) => {
    setUninstallApp(app)
    setUninstallOpen(true)
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-7 lg:px-10">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-primary text-xl font-medium tracking-tight">
            {t('apps.title')}
          </h1>
          <span className="bg-brand/10 text-brand inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium">
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
            onShowDetails={handleShowDetails}
            onRequestUninstall={handleRequestUninstall}
          />
        </TabsContent>

        <TabsContent value="my-apps" className="mt-0">
          <AppGrid
            apps={myApps}
            isLoading={isLoading}
            emptyTitle={t('apps.empty.myApps.title')}
            emptyDescription={t('apps.empty.myApps.description')}
            onShowDetails={handleShowDetails}
            onRequestUninstall={handleRequestUninstall}
          />
        </TabsContent>
      </Tabs>

      <AppDetailDrawer
        app={detailsApp}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />

      <UninstallAppDialog
        app={uninstallApp}
        open={uninstallOpen}
        onOpenChange={setUninstallOpen}
      />
    </div>
  )
}

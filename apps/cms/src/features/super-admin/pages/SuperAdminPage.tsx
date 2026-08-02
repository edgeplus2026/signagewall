import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AppCatalogTab } from '@/features/apps/components/AppCatalogTab'
import { AdminNotificationsTab } from '@/features/notifications/components/AdminNotificationsTab'
import { AllUsersTab } from '@/features/super-admin/components/AllUsersTab'
import { UpgradeRequestsTab } from '@/features/super-admin/components/UpgradeRequestsTab'
import { useOpenUpgradeRequestCount } from '@/features/super-admin/hooks/useAdminUsers'
import { useEnsureSuperAdminSession } from '@/features/super-admin/hooks/useEnsureSuperAdminSession'

type SuperAdminTab = 'users' | 'upgrade-requests' | 'apps' | 'notifications'

function getActiveTab(tab: string | null): SuperAdminTab {
  if (tab === 'apps') return 'apps'
  if (tab === 'notifications') return 'notifications'
  if (tab === 'upgrade-requests') return 'upgrade-requests'
  return 'users'
}

export default function SuperAdminPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = getActiveTab(searchParams.get('tab'))
  const { isRecovering } = useEnsureSuperAdminSession()
  const { data: openRequestCount = 0 } = useOpenUpgradeRequestCount()

  if (isRecovering) {
    return (
      <div className="text-muted-foreground flex w-full items-center justify-center px-10 py-16 text-sm">
        {t('superAdmin.impersonation.restoring')}
      </div>
    )
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-7 lg:px-10">
      <h1 className="text-primary text-xl font-medium tracking-tight">
        {t('superAdmin.title')}
      </h1>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          if (value === 'users') {
            setSearchParams({})
          } else {
            setSearchParams({ tab: value })
          }
        }}
        className="flex flex-col gap-7"
      >
        <TabsList variant="line" className="w-fit shrink-0">
          <TabsTrigger value="users">{t('superAdmin.tabs.users')}</TabsTrigger>
          <TabsTrigger value="upgrade-requests">
            {t('superAdmin.tabs.upgradeRequests')}
            {openRequestCount > 0 ? (
              <span className="bg-brand/10 text-brand ml-1.5 inline-flex min-w-4 items-center justify-center rounded-md px-1 py-0.5 text-[10px] font-medium">
                {openRequestCount}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="apps">{t('superAdmin.tabs.apps')}</TabsTrigger>
          <TabsTrigger value="notifications">{t('superAdmin.tabs.notifications')}</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-0">
          <AllUsersTab />
        </TabsContent>

        <TabsContent value="upgrade-requests" className="mt-0">
          <UpgradeRequestsTab />
        </TabsContent>

        <TabsContent value="apps" className="mt-0">
          <AppCatalogTab />
        </TabsContent>

        <TabsContent value="notifications" className="mt-0">
          <AdminNotificationsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

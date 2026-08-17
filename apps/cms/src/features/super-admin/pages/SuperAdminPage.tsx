import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AnalyticsTab } from '@/features/analytics/components/AnalyticsTab'
import { AppCatalogTab } from '@/features/apps/components/AppCatalogTab'
import { BillingTab } from '@/features/billing/components/BillingTab'
import { useBillingOverview } from '@/features/billing/hooks/useAdminBilling'
import { CrmTab } from '@/features/crm/components/CrmTab'
import { useCrmOverview } from '@/features/crm/hooks/useCrmLeads'
import { AdminNotificationsTab } from '@/features/notifications/components/AdminNotificationsTab'
import { AllUsersTab } from '@/features/super-admin/components/AllUsersTab'
import { PlayerSettingsTab } from '@/features/super-admin/components/PlayerSettingsTab'
import { UpgradeRequestsTab } from '@/features/super-admin/components/UpgradeRequestsTab'
import { useOpenUpgradeRequestCount } from '@/features/super-admin/hooks/useAdminUsers'
import { useEnsureSuperAdminSession } from '@/features/super-admin/hooks/useEnsureSuperAdminSession'

type SuperAdminTab =
  | 'users'
  | 'upgrade-requests'
  | 'billing'
  | 'crm'
  | 'analytics'
  | 'apps'
  | 'notifications'
  | 'player'

function getActiveTab(tab: string | null): SuperAdminTab {
  if (tab === 'player') return 'player'
  if (tab === 'apps') return 'apps'
  if (tab === 'notifications') return 'notifications'
  if (tab === 'billing') return 'billing'
  if (tab === 'crm') return 'crm'
  if (tab === 'analytics') return 'analytics'
  if (tab === 'upgrade-requests') return 'upgrade-requests'
  return 'users'
}

export default function SuperAdminPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = getActiveTab(searchParams.get('tab'))
  const { isRecovering } = useEnsureSuperAdminSession()
  const { data: openRequestCount = 0 } = useOpenUpgradeRequestCount()
  const { data: billingOverview } = useBillingOverview()
  const { data: crmOverview } = useCrmOverview()

  if (isRecovering) {
    return (
      <div className="text-muted-foreground flex w-full items-center justify-center px-10 py-16 text-sm">
        {t('superAdmin.impersonation.restoring')}
      </div>
    )
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-7 lg:px-10">
      <h1 className="text-primary text-xl font-medium tracking-tight">{t('superAdmin.title')}</h1>

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
          <TabsTrigger value="billing">
            {t('superAdmin.tabs.billing')}
            {(billingOverview?.exceptionCount ?? 0) > 0 ? (
              <span className="bg-danger/10 text-danger ml-1.5 inline-flex min-w-4 items-center justify-center rounded-md px-1 py-0.5 text-[10px] font-medium">
                {billingOverview?.exceptionCount}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="crm">
            {t('superAdmin.tabs.crm')}
            {(crmOverview?.byStatus.new ?? 0) > 0 ? (
              <span className="bg-info/10 text-info ml-1.5 inline-flex min-w-4 items-center justify-center rounded-md px-1 py-0.5 text-[10px] font-medium">
                {crmOverview?.byStatus.new}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="analytics">{t('superAdmin.tabs.analytics')}</TabsTrigger>
          <TabsTrigger value="apps">{t('superAdmin.tabs.apps')}</TabsTrigger>
          <TabsTrigger value="notifications">{t('superAdmin.tabs.notifications')}</TabsTrigger>
          <TabsTrigger value="player">{t('superAdmin.tabs.player')}</TabsTrigger>
        </TabsList>

        <TabsContent value="player" className="mt-0">
          <PlayerSettingsTab />
        </TabsContent>

        <TabsContent value="users" className="mt-0">
          <AllUsersTab />
        </TabsContent>

        <TabsContent value="upgrade-requests" className="mt-0">
          <UpgradeRequestsTab />
        </TabsContent>

        <TabsContent value="billing" className="mt-0">
          <BillingTab />
        </TabsContent>

        <TabsContent value="crm" className="mt-0">
          <CrmTab />
        </TabsContent>

        <TabsContent value="analytics" className="mt-0">
          <AnalyticsTab />
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

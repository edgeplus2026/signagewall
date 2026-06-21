import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AppCatalogTab } from '@/features/apps/components/AppCatalogTab'
import { AllUsersTab } from '@/features/super-admin/components/AllUsersTab'
import { useEnsureSuperAdminSession } from '@/features/super-admin/hooks/useEnsureSuperAdminSession'

type SuperAdminTab = 'users' | 'apps'

function getActiveTab(tab: string | null): SuperAdminTab {
  return tab === 'apps' ? 'apps' : 'users'
}

export default function SuperAdminPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = getActiveTab(searchParams.get('tab'))
  const { isRecovering } = useEnsureSuperAdminSession()

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
          <TabsTrigger value="apps">{t('superAdmin.tabs.apps')}</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-0">
          <AllUsersTab />
        </TabsContent>

        <TabsContent value="apps" className="mt-0">
          <AppCatalogTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

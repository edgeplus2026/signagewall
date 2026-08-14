import { Outlet } from 'react-router-dom'

import { AppSidebarNav } from '@/components/layout/AppSidebarNav'
import { OrganizationSwitcher } from '@/components/layout/OrganizationSwitcher'
import { SidebarUserMenu } from '@/components/layout/SidebarUserMenu'
import { AppPageBreadcrumb } from '@/components/layout/page-header/AppPageBreadcrumb'
import { PageHeaderProvider } from '@/components/layout/page-header/PageHeaderContext'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { AiGeneratorSheet } from '@/features/ai-generator/components/AiGeneratorSheet'
import { useAiGenerationNotifications } from '@/features/ai-generator/hooks'
import { UploadManager } from '@/features/media/components/UploadManager'
import { NotificationBell } from '@/features/notifications/components/NotificationBell'
import { OnboardingHeaderButton } from '@/features/onboarding/components/OnboardingHeaderButton'
import { OnboardingWidget } from '@/features/onboarding/components/OnboardingWidget'
import { OrganizationGate } from '@/features/organizations/components/OrganizationGate'
import { PlanHeaderButton } from '@/features/plans/components/PlanHeaderButton'
import { UpgradePlanDialog } from '@/features/plans/components/UpgradePlanDialog'
import { ImpersonationBanner } from '@/features/super-admin/components/ImpersonationBanner'

export default function AppLayout() {
  // App-wide: keeps the generation history live and toasts the initiator when
  // their generation finishes, even if the drawer is closed.
  useAiGenerationNotifications()

  return (
    <OrganizationGate>
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <OrganizationSwitcher />
        </SidebarHeader>
        <SidebarContent>
          <AppSidebarNav />
        </SidebarContent>
        <SidebarFooter>
          <SidebarUserMenu />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <PageHeaderProvider>
          <ImpersonationBanner />
          <header className="border-quaternary sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-page px-4">
            <SidebarTrigger />
            <AppPageBreadcrumb />
            <div className="ml-auto flex items-center gap-2">
              <OnboardingHeaderButton />
              <PlanHeaderButton />
              <NotificationBell />
            </div>
          </header>
          <main className="bg-page min-w-0 flex-1 p-4 max-w-7xl mx-auto w-full">
            <Outlet />
          </main>
          <OnboardingWidget />
          <UploadManager />
          <AiGeneratorSheet />
          {/* Mounted once: opened from the header, and from any create that the
              plan gate refuses. */}
          <UpgradePlanDialog />
        </PageHeaderProvider>
      </SidebarInset>
    </SidebarProvider>
    </OrganizationGate>
  )
}

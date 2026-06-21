import { Outlet } from 'react-router-dom'

import { AppSidebarNav } from '@/components/layout/AppSidebarNav'
import { OrganizationSwitcher } from '@/components/layout/OrganizationSwitcher'
import { AppPageBreadcrumb } from '@/components/layout/page-header/AppPageBreadcrumb'
import { PageHeaderProvider } from '@/components/layout/page-header/PageHeaderContext'
import { SidebarUserMenu } from '@/components/layout/SidebarUserMenu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { OrganizationGate } from '@/features/organizations/components/OrganizationGate'
import { ImpersonationBanner } from '@/features/super-admin/components/ImpersonationBanner'
import { UploadManager } from '@/features/media/components/UploadManager'

export default function AppLayout() {
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
          </header>
          <main className="bg-page min-w-0 flex-1 p-4 max-w-7xl mx-auto w-full">
            <Outlet />
          </main>
          <UploadManager />
        </PageHeaderProvider>
      </SidebarInset>
    </SidebarProvider>
    </OrganizationGate>
  )
}

import {
  CalendarClock,
  Film,
  LayoutDashboard,
  ListVideo,
  Monitor,
  Rocket,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

const NAV_ITEMS = [
  { key: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
  { key: 'screens', href: '/screens', icon: Monitor },
  { key: 'playlists', href: '/playlists', icon: ListVideo },
  { key: 'schedules', href: '/schedules', icon: CalendarClock },
  { key: 'media', href: '/media', icon: Film },
  { key: 'apps', href: '/apps', icon: Rocket },
] as const

export function AppSidebarNav() {
  const { t } = useTranslation()
  const { pathname } = useLocation()

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu className="gap-1">
          {NAV_ITEMS.map(({ key, href, icon: Icon }) => (
            <SidebarMenuItem key={key}>
              <SidebarMenuButton
                asChild
                isActive={pathname === href || pathname.startsWith(`${href}/`)}
              >
                <Link to={href}>
                  <Icon />
                  {t(`layout.${key}`)}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

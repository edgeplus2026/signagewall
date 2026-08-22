import { ChevronsUpDown, CircleHelp, Download, LogOut, Settings, Shield, Users } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import { authApi } from '@/features/auth/api/authApi'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useOrganizationStore } from '@/features/organizations/store/organizationStore'

const menuItemClassName =
  'focus:!bg-highlight focus:!text-primary focus:**:!text-primary data-highlighted:!bg-highlight data-highlighted:!text-primary data-highlighted:**:!text-primary'

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function SidebarUserMenu() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const impersonationActive = useAuthStore((state) => state.impersonationActive)
  const logout = useAuthStore((state) => state.logout)
  const [logoutOpen, setLogoutOpen] = useState(false)

  const displayName = user?.name ?? t('layout.guestUser')
  const displayEmail = user?.email ?? t('layout.guestEmail')

  const handleLogout = () => {
    void authApi.logout().catch(() => undefined)
    logout()
    useOrganizationStore.getState().reset()
    setLogoutOpen(false)
    void navigate('/login')
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-highlight data-[state=open]:text-primary"
              >
                <Avatar className="size-8 rounded-lg after:rounded-lg">
                  <AvatarFallback className="!text-secondary group-hover/menu-button:!text-secondary group-data-[state=open]/menu-button:!text-secondary rounded-lg">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{displayName}</span>
                  <span className="text-secondary truncate text-xs">{displayEmail}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              side="top"
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="size-8 rounded-lg after:rounded-lg">
                    <AvatarFallback className="!text-secondary rounded-lg">
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{displayName}</span>
                    <span className="text-secondary truncate text-xs">{displayEmail}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {user?.isSuperAdmin && !impersonationActive ? (
                <>
                  <DropdownMenuItem asChild className={menuItemClassName}>
                    <Link to="/super-admin">
                      <Shield />
                      {t('layout.superAdmin')}
                    </Link>
                  </DropdownMenuItem>
                </>
              ) : null}
              <DropdownMenuItem asChild className={menuItemClassName}>
                <Link to="/settings">
                  <Settings />
                  {t('layout.settings')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className={menuItemClassName}>
                <Link to="/users">
                  <Users />
                  {t('layout.users')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className={menuItemClassName}>
                <Link to="/downloads">
                  <Download />
                  {t('layout.downloads')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className={menuItemClassName}>
                <Link to="/faq">
                  <CircleHelp />
                  {t('layout.faq')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="danger"
                onClick={() => {
                  setLogoutOpen(true)
                }}
              >
                <LogOut />
                {t('layout.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t('layout.logoutConfirm.title')}</DialogTitle>
            <DialogDescription>{t('layout.logoutConfirm.description')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setLogoutOpen(false)
              }}
            >
              {t('layout.logoutConfirm.cancel')}
            </Button>
            <Button variant="danger" onClick={handleLogout}>
              {t('layout.logoutConfirm.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

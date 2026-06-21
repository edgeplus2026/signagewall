import { Check, ChevronsUpDown, PencilIcon, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { DeleteOrganizationDialog } from '@/features/organizations/components/DeleteOrganizationDialog'
import { OrganizationFormSheet } from '@/features/organizations/components/OrganizationFormSheet'
import { useIsOrgAdmin } from '@/features/organizations/hooks/useIsOrgAdmin'
import {
  useActiveOrganization,
  useOrganizationStore,
} from '@/features/organizations/store/organizationStore'
import type { Organization } from '@/features/organizations/types/organization.types'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

const menuItemClassName =
  'gap-2 p-2 focus:!bg-highlight data-highlighted:!bg-highlight text-primary focus:**:text-primary data-highlighted:**:text-primary [&_[data-org-icon]_span]:!text-brand-contrast [&_[data-org-icon]]:shrink-0 [&_[data-org-action]]:pointer-events-auto'

const addMenuItemClassName = cn(
  menuItemClassName,
  'text-secondary focus:!text-secondary data-highlighted:!text-secondary focus:**:!text-secondary data-highlighted:**:!text-secondary',
)

function OrganizationIcon({ name }: { name: string }) {
  return (
    <div
      data-org-icon
      className="bg-brand flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg"
    >
      <span className="text-brand-contrast text-sm font-medium">
        {name.charAt(0).toUpperCase()}
      </span>
    </div>
  )
}

export function OrganizationSwitcher() {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const activeOrganization = useActiveOrganization()
  const isAdmin = useIsOrgAdmin()
  const organizations = useOrganizationStore((state) => state.organizations)
  const setActiveOrganization = useOrganizationStore((state) => state.setActiveOrganization)
  const [menuOpen, setMenuOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOrganization, setEditOrganization] = useState<Organization | null>(null)
  const [deleteOrganization, setDeleteOrganization] = useState<Organization | null>(null)

  if (!activeOrganization) return null

  const canDeleteOrganization = (organization: Organization) =>
    organizations.length > 1 && organization.id !== activeOrganization.id

  const openDeleteDialog = (organization: Organization) => {
    setMenuOpen(false)
    setDeleteOrganization(organization)
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-highlight data-[state=open]:text-primary [&_[data-org-icon]_span]:!text-brand-contrast"
              >
                <OrganizationIcon name={activeOrganization.name} />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{activeOrganization.name}</span>
                  <span className="text-secondary truncate text-xs">
                    {t('organizations.active')}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="min-w-56 rounded-lg p-2"
              align="start"
              side={isMobile ? 'bottom' : 'right'}
              sideOffset={4}
              alignOffset={4}
            >
              <DropdownMenuLabel className="text-secondary px-1 pb-1.5 pt-0 text-xs">
                {t('organizations.title')}
              </DropdownMenuLabel>
              {organizations.map((organization) => (
                <DropdownMenuItem
                  key={organization.id}
                  onSelect={(event) => {
                    const target = event.target as HTMLElement
                    if (target.closest('[data-org-action]')) {
                      event.preventDefault()
                      return
                    }
                    setActiveOrganization(organization.id)

                    window.location.reload()
                  }}
                  className={cn(menuItemClassName, 'pr-1')}
                >
                  <OrganizationIcon name={organization.name} />
                  <span className="min-w-0 flex-1 truncate">{organization.name}</span>
                  {organization.id === activeOrganization.id ? (
                    <Check className="text-success size-3.5 shrink-0" />
                  ) : null}
                  {isAdmin ? (
                    <button
                      type="button"
                      data-org-action
                      className="text-secondary hover:text-primary flex size-5 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-highlight"
                      onClick={() => {
                        setMenuOpen(false)
                        setEditOrganization(organization)
                      }}
                    >
                      <PencilIcon className="size-3" />
                      <span className="sr-only">
                        {t('organizations.actions.edit', { name: organization.name })}
                      </span>
                    </button>
                  ) : null}
                  {isAdmin && canDeleteOrganization(organization) ? (
                    <button
                      type="button"
                      data-org-action
                      className="text-secondary hover:text-danger flex size-5 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-highlight"
                      onClick={() => {
                        openDeleteDialog(organization)
                      }}
                    >
                      <Trash2 className="size-3" />
                      <span className="sr-only">
                        {t('organizations.actions.delete', { name: organization.name })}
                      </span>
                    </button>
                  ) : null}
                </DropdownMenuItem>
              ))}
              {isAdmin ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className={addMenuItemClassName}
                    onClick={() => {
                      setCreateOpen(true)
                    }}
                  >
                    <div className="flex size-6 items-center justify-center rounded-md border bg-page">
                      <Plus className="size-4" />
                    </div>
                    <span className="font-medium">{t('organizations.add')}</span>
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <OrganizationFormSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
      />

      <OrganizationFormSheet
        open={!!editOrganization}
        onOpenChange={(open) => {
          if (!open) setEditOrganization(null)
        }}
        mode="edit"
        organization={editOrganization}
      />

      <DeleteOrganizationDialog
        open={!!deleteOrganization}
        onOpenChange={(open) => {
          if (!open) setDeleteOrganization(null)
        }}
        organization={deleteOrganization}
      />
    </>
  )
}

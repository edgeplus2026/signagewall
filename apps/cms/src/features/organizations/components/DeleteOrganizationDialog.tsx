import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { organizationApi } from '@/features/organizations/api/organizationApi'
import { useOrganizationStore } from '@/features/organizations/store/organizationStore'
import type { Organization } from '@/features/organizations/types/organization.types'
import { getApiErrorMessage } from '@/lib/api-error'
import { syncOrganizationsQuery } from '@/features/organizations/lib/syncOrganizationsQuery'

interface DeleteOrganizationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organization: Organization | null
}

export function DeleteOrganizationDialog({
  open,
  onOpenChange,
  organization,
}: DeleteOrganizationDialogProps) {
  const { t } = useTranslation()
  const removeOrganization = useOrganizationStore((state) => state.removeOrganization)

  const handleDelete = async () => {
    if (!organization) return

    try {
      await organizationApi.delete(organization.id)
      removeOrganization(organization.id)
      await syncOrganizationsQuery()
      toast.success(t('organizations.delete.success'))
      onOpenChange(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('organizations.delete.error')))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t('organizations.delete.title')}</DialogTitle>
          <DialogDescription>
            {t('organizations.delete.description', {
              name: organization?.name ?? '',
            })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {t('organizations.delete.cancel')}
          </Button>
          <Button variant="danger" onClick={() => void handleDelete()}>
            {t('organizations.delete.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

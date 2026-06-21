import { useState } from 'react'
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
import type { InvitationPreview } from '@/features/auth/api/invitationsApi'
import { invitationsApi } from '@/features/auth/api/invitationsApi'
import { organizationApi } from '@/features/organizations/api/organizationApi'
import { useOrganizationStore } from '@/features/organizations/store/organizationStore'

interface AcceptInviteDialogProps {
  open: boolean
  inviteToken: string
  preview: InvitationPreview
  onResolved: () => void
}

export function AcceptInviteDialog({
  open,
  inviteToken,
  preview,
  onResolved,
}: AcceptInviteDialogProps) {
  const { t } = useTranslation()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const setOrganizations = useOrganizationStore((state) => state.setOrganizations)
  const setActiveOrganization = useOrganizationStore((state) => state.setActiveOrganization)

  const handleAccept = async () => {
    setIsSubmitting(true)
    try {
      const result = await invitationsApi.accept(inviteToken)
      const organizations = await organizationApi.list()
      setOrganizations(organizations)
      setActiveOrganization(result.organizationId)
      toast.success(
        t('auth.acceptInvite.success', { name: preview.organizationName }),
      )
      onResolved()
    } catch {
      toast.error(t('auth.acceptInvite.acceptError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDecline = async () => {
    setIsSubmitting(true)
    try {
      await invitationsApi.decline(inviteToken)
      toast.success(t('auth.acceptInvite.declineSuccess'))
      onResolved()
    } catch {
      toast.error(t('auth.acceptInvite.declineError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t('auth.acceptInvite.title')}</DialogTitle>
          <DialogDescription>
            {t('auth.acceptInvite.description', {
              organization: preview.organizationName,
              role: t(`users.roles.${preview.role}`),
            })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" disabled={isSubmitting} onClick={() => void handleDecline()}>
            {t('auth.acceptInvite.decline')}
          </Button>
          <Button disabled={isSubmitting} onClick={() => void handleAccept()}>
            {t('auth.acceptInvite.accept')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
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
import { useAuthStore } from '@/features/auth/store/authStore'
import { useOrganizationStore } from '@/features/organizations/store/organizationStore'
import { queryClient } from '@/providers/QueryProvider'
import { settingsApi } from '@/features/settings/api/settingsApi'
import { SettingsRow, SettingsSection } from '@/features/settings/components/SettingsSection'

export function AccountActionsSection() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleLogout = () => {
    logout()
    setLogoutOpen(false)
    void navigate('/login')
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      await settingsApi.deleteAccount()
      logout()
      useOrganizationStore.getState().reset()
      queryClient.removeQueries({ queryKey: ['organizations'] })
      setDeleteOpen(false)
      toast.success(t('settings.account.deleteSuccess'))
      void navigate('/login')
    } catch {
      toast.error(t('settings.account.deleteError'))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <SettingsSection title={t('settings.sections.account')}>
        <SettingsRow label={t('settings.account.logout')}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setLogoutOpen(true)
            }}
          >
            {t('layout.logout')}
          </Button>
        </SettingsRow>

        <SettingsRow label={t('settings.account.deleteAccount')}>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => {
              setDeleteOpen(true)
            }}
          >
            {t('settings.account.deleteAccount')}
          </Button>
        </SettingsRow>
      </SettingsSection>

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

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t('settings.account.deleteConfirm.title')}</DialogTitle>
            <DialogDescription>{t('settings.account.deleteConfirm.description')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteOpen(false)
              }}
            >
              {t('settings.account.deleteConfirm.cancel')}
            </Button>
            <Button variant="danger" disabled={isDeleting} onClick={() => void handleDeleteAccount()}>
              {t('settings.account.deleteConfirm.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

import { TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
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
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useOrganizationStore } from '@/features/organizations/store/organizationStore'
import { settingsApi } from '@/features/settings/api/settingsApi'
import { SettingsRow, SettingsSection } from '@/features/settings/components/SettingsSection'
import { getApiErrorMessage } from '@/lib/api-error'
import { queryClient } from '@/providers/QueryProvider'

export function AccountActionsSection() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  const deleteKeyword = t('settings.account.deleteConfirm.keyword')
  const canDelete = confirmText.trim() === deleteKeyword

  const handleDeleteOpenChange = (open: boolean) => {
    setDeleteOpen(open)
    if (!open) {
      setConfirmText('')
    }
  }

  const handleLogout = () => {
    logout()
    setLogoutOpen(false)
    void navigate('/login')
  }

  const handleDeleteAccount = async () => {
    if (!canDelete) {
      return
    }
    setIsDeleting(true)
    try {
      await settingsApi.deleteAccount()
      logout()
      useOrganizationStore.getState().reset()
      queryClient.removeQueries({ queryKey: ['organizations'] })
      setDeleteOpen(false)
      toast.success(t('settings.account.deleteSuccess'))
      void navigate('/login')
    } catch (error) {
      // Surfaces the sole-admin owner-blocker message from the API.
      toast.error(getApiErrorMessage(error, t('settings.account.deleteError')))
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

      <Dialog open={deleteOpen} onOpenChange={handleDeleteOpenChange}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <div className="bg-danger/10 text-danger mx-auto mb-1 flex size-11 items-center justify-center rounded-full">
              <TriangleAlert className="size-5" />
            </div>
            <DialogTitle className="text-center">
              {t('settings.account.deleteConfirm.title')}
            </DialogTitle>
            <DialogDescription className="text-center">
              {t('settings.account.deleteConfirm.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="border-secondary/60 bg-sidebar/40 text-secondary flex flex-col gap-2 rounded-lg border p-3 text-[13px] leading-snug">
            <p>{t('settings.account.deleteConfirm.point1')}</p>
            <p>{t('settings.account.deleteConfirm.point2')}</p>
            <p className="text-primary">
              {t('settings.account.deleteConfirm.recover')}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="delete-confirm" className="text-primary text-sm">
              <Trans
                i18nKey="settings.account.deleteConfirm.prompt"
                values={{ keyword: deleteKeyword }}
                components={{ b: <span className="text-danger font-semibold" /> }}
              />
            </label>
            <Input
              id="delete-confirm"
              value={confirmText}
              autoComplete="off"
              placeholder={deleteKeyword}
              onChange={(event) => {
                setConfirmText(event.target.value)
              }}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                handleDeleteOpenChange(false)
              }}
            >
              {t('settings.account.deleteConfirm.cancel')}
            </Button>
            <Button
              variant="danger"
              disabled={isDeleting || !canDelete}
              onClick={() => void handleDeleteAccount()}
            >
              {t('settings.account.deleteConfirm.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

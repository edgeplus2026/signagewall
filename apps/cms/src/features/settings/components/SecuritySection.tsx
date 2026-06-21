import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/features/auth/store/authStore'
import { ChangePasswordSheet } from '@/features/settings/components/ChangePasswordSheet'
import { SetPasswordSheet } from '@/features/settings/components/SetPasswordSheet'
import { SettingsRow, SettingsSection } from '@/features/settings/components/SettingsSection'

export function SecuritySection() {
  const { t } = useTranslation()
  const hasPassword = useAuthStore((state) => state.user?.hasPassword ?? true)
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <>
      <SettingsSection title={t('settings.sections.security')}>
        <SettingsRow
          label={t('settings.security.password')}
          {...(!hasPassword ? { description: t('settings.security.noPasswordHint') } : {})}
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setSheetOpen(true)
            }}
          >
            {hasPassword
              ? t('settings.security.changePassword')
              : t('settings.security.setPassword')}
          </Button>
        </SettingsRow>
      </SettingsSection>

      {hasPassword ? (
        <ChangePasswordSheet open={sheetOpen} onOpenChange={setSheetOpen} />
      ) : (
        <SetPasswordSheet open={sheetOpen} onOpenChange={setSheetOpen} />
      )}
    </>
  )
}

import { useTranslation } from 'react-i18next'

import { AccountActionsSection } from '@/features/settings/components/AccountActionsSection'
import { DeviceAlertsSection } from '@/features/settings/components/DeviceAlertsSection'
import { HelpSection } from '@/features/settings/components/HelpSection'
import { PreferencesSection } from '@/features/settings/components/PreferencesSection'
import { SecuritySection } from '@/features/settings/components/SecuritySection'
import { UserDetailsSection } from '@/features/settings/components/UserDetailsSection'

export default function SettingsPage() {
  const { t } = useTranslation()

  return (
    <div className="flex w-full min-w-0 flex-col gap-7 lg:px-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-primary text-xl font-medium tracking-tight">
          {t('settings.title')}
        </h1>
        <p className="text-secondary text-sm">{t('settings.description')}</p>
      </div>
      <UserDetailsSection />
      <PreferencesSection />
      <DeviceAlertsSection />
      <SecuritySection />
      <HelpSection />
      <AccountActionsSection />
    </div>
  )
}

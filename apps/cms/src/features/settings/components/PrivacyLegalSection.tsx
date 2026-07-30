import { Download, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { legalUrl } from '@/features/legal/legalUrls'
import { settingsApi } from '@/features/settings/api/settingsApi'
import { SettingsRow, SettingsSection } from '@/features/settings/components/SettingsSection'
import { getApiErrorMessage } from '@/lib/api-error'

/**
 * Privacy & legal settings: GDPR data export plus links to the current Terms of
 * Service and Privacy Policy.
 *
 * The documents are published on the marketing site, not rendered in here — see
 * `legalUrls`. These are external links on purpose; the dashboard no longer has
 * a /legal route to send anyone to.
 */
export function PrivacyLegalSection() {
  const { t, i18n } = useTranslation()
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const data = await settingsApi.exportData()
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `my-data-${new Date().toISOString().slice(0, 10)}.json`
      anchor.click()
      URL.revokeObjectURL(url)
      toast.success(t('settings.privacy.export.success'))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('settings.privacy.export.error')))
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <SettingsSection title={t('settings.sections.privacy')}>
      <SettingsRow
        label={t('settings.privacy.export.label')}
        description={t('settings.privacy.export.description')}
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isExporting}
          onClick={() => void handleExport()}
        >
          <Download />
          {t('settings.privacy.export.action')}
        </Button>
      </SettingsRow>

      <SettingsRow
        label={t('settings.privacy.terms.label')}
        description={t('settings.privacy.terms.description')}
      >
        <Button variant="outline" size="sm" asChild>
          <a href={legalUrl('tos', i18n.language)} target="_blank" rel="noreferrer">
            {t('settings.privacy.terms.action')}
            <ExternalLink />
          </a>
        </Button>
      </SettingsRow>

      <SettingsRow
        label={t('settings.privacy.privacy.label')}
        description={t('settings.privacy.privacy.description')}
      >
        <Button variant="outline" size="sm" asChild>
          <a href={legalUrl('privacy', i18n.language)} target="_blank" rel="noreferrer">
            {t('settings.privacy.privacy.action')}
            <ExternalLink />
          </a>
        </Button>
      </SettingsRow>
    </SettingsSection>
  )
}

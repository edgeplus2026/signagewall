import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { FeedbackSheet } from '@/features/settings/components/FeedbackSheet'
import { ReportProblemSheet } from '@/features/settings/components/ReportProblemSheet'
import { SettingsRow, SettingsSection } from '@/features/settings/components/SettingsSection'

export function HelpSection() {
  const { t } = useTranslation()
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)

  return (
    <>
      <SettingsSection title={t('settings.sections.help')}>
        <SettingsRow label={t('settings.feedback.leaveFeedback')}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setFeedbackOpen(true)
            }}
          >
            {t('settings.feedback.open')}
          </Button>
        </SettingsRow>

        <SettingsRow label={t('settings.support.reportProblem.label')}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setReportOpen(true)
            }}
          >
            {t('settings.support.reportProblem.open')}
          </Button>
        </SettingsRow>
      </SettingsSection>

      <FeedbackSheet open={feedbackOpen} onOpenChange={setFeedbackOpen} />
      <ReportProblemSheet open={reportOpen} onOpenChange={setReportOpen} />
    </>
  )
}

import { StethoscopeIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { useRequestDeviceDiagnostics } from '@/features/screens/hooks/useScreens'
import type { StoredDiagnosticsReport } from '@/features/screens/types/screen.types'
import {
  SettingsRow,
  SettingsSection,
} from '@/features/settings/components/SettingsSection'
import { getApiErrorMessage } from '@/lib/api-error'

interface DeviceDiagnosticsPanelProps {
  screenId: string
  report?: StoredDiagnosticsReport | undefined
}

/**
 * The remote equivalent of walking up to a screen and opening its service menu.
 *
 * The report is always shown with the time the DEVICE assembled it, never as a
 * live reading. A screen that has gone offline keeps showing its last answer, and
 * an operator reading a two-day-old log as current is how a healthy device gets
 * blamed for a fault that was fixed on Tuesday.
 */
export function DeviceDiagnosticsPanel({
  screenId,
  report,
}: DeviceDiagnosticsPanelProps) {
  const { t } = useTranslation()
  const request = useRequestDeviceDiagnostics()

  const onRequest = async () => {
    try {
      await request.mutateAsync(screenId)
      toast.success(t('screens.device.diagnostics.requested'))
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, t('screens.device.diagnostics.error')),
      )
    }
  }

  return (
    <SettingsSection title={t('screens.device.diagnostics.title')}>
      <SettingsRow
        label={t('screens.device.diagnostics.rowTitle')}
        description={t('screens.device.diagnostics.rowDescription')}
      >
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void onRequest()}
          disabled={request.isPending}
        >
          <StethoscopeIcon className="size-4" />
          {t('screens.device.diagnostics.button')}
        </Button>
      </SettingsRow>

      {report ? (
        <div className="flex flex-col gap-2 px-4 pb-4">
          <p className="text-muted-foreground text-xs">
            {t('screens.device.diagnostics.capturedAt', {
              at: report.at
                ? new Date(report.at).toLocaleString()
                : t('screens.device.unknown'),
            })}
          </p>

          {report.log && report.log.length > 0 ? (
            // Newest first: the answer to "what just happened" is the last thing
            // written, and nobody should have to scroll a log to reach it.
            <pre className="bg-muted/40 text-secondary max-h-80 overflow-auto rounded-md p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
              {[...report.log].reverse().join('\n')}
            </pre>
          ) : (
            <p className="text-muted-foreground text-xs">
              {t('screens.device.diagnostics.noLog')}
            </p>
          )}
        </div>
      ) : null}
    </SettingsSection>
  )
}

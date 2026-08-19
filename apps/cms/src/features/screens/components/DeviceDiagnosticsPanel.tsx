import { ScrollTextIcon, StethoscopeIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { useIsSuperAdmin } from '@/features/auth/hooks/useIsSuperAdmin'
import {
  useRequestDeviceDiagnostics,
  useRequestShellLog,
} from '@/features/screens/hooks/useScreens'
import type { StoredDiagnosticsReport } from '@/features/screens/types/screen.types'
import { SettingsRow, SettingsSection } from '@/features/settings/components/SettingsSection'
import { getApiErrorMessage } from '@/lib/api-error'

interface DeviceDiagnosticsPanelProps {
  screenId: string
  report?: StoredDiagnosticsReport | undefined
  /**
   * The log the SHELL brought on its own check-in — a different artifact from the
   * on-demand report: it survives a dead player page, and it is the only thing the
   * "ask the shell" row below can ever produce.
   */
  shellLog?: string[] | undefined
  /** When that check-in landed, so an old log is never read as current. */
  shellLogAt?: string | undefined
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
  shellLog,
  shellLogAt,
}: DeviceDiagnosticsPanelProps) {
  const { t } = useTranslation()
  const isSuperAdmin = useIsSuperAdmin()
  const request = useRequestDeviceDiagnostics()
  const requestShellLog = useRequestShellLog()

  const onRequest = async () => {
    try {
      await request.mutateAsync(screenId)
      toast.success(t('screens.device.diagnostics.requested'))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('screens.device.diagnostics.error')))
    }
  }

  const onRequestShellLog = async () => {
    try {
      await requestShellLog.mutateAsync(screenId)
      toast.success(t('screens.device.diagnostics.shellLogRequested'))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('screens.device.diagnostics.error')))
    }
  }

  // Support instrument, not a customer control. A cache count and a shell log
  // read as "something is wrong with my screen" to the person who owns it, and
  // the request itself does nothing they can act on. Gated here rather than at
  // the call site so a new one cannot forget it.
  if (!isSuperAdmin) {
    return null
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

      {/* The other route to a log, and the only one that survives the failure
          worth investigating: the request above rides the socket and so needs the
          player page alive, while this sets a flag the shell collects on its own
          poll. Slower by design — up to one check-in interval. */}
      <SettingsRow
        label={t('screens.device.diagnostics.shellLogTitle')}
        description={t('screens.device.diagnostics.shellLogDescription')}
      >
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void onRequestShellLog()}
          disabled={requestShellLog.isPending}
        >
          <ScrollTextIcon className="size-4" />
          {t('screens.device.diagnostics.shellLogButton')}
        </Button>
      </SettingsRow>

      {/* Without this the button asked for something nothing displayed. The shell's
          log arrives inside its next status report — i.e. in `shellStatus`, a
          different field from the on-demand `diagnostics` report below — and the
          check-in after it replaces `shellStatus` wholesale, so it is worth reading
          while it is here. */}
      {shellLog && shellLog.length > 0 ? (
        <div className="flex flex-col gap-2 px-4 py-3">
          <p className="text-muted-foreground text-xs">
            {t('screens.device.diagnostics.capturedAt', {
              at: shellLogAt ? new Date(shellLogAt).toLocaleString() : t('screens.device.unknown'),
            })}
          </p>
          <pre className="text-secondary max-h-64 overflow-auto text-xs whitespace-pre-wrap">
            {[...shellLog].reverse().join('\n')}
          </pre>
        </div>
      ) : null}

      {report ? (
        // `py-3`, not `pb-4`: this block sits under a divider, and with bottom
        // padding only the first line hugged the rule above it. The vertical
        // rhythm matches SettingsRow so the report reads as another row of the
        // same panel rather than a slab bolted underneath.
        <div className="flex flex-col gap-2 px-4 py-3">
          <p className="text-muted-foreground text-xs">
            {t('screens.device.diagnostics.capturedAt', {
              at: report.at ? new Date(report.at).toLocaleString() : t('screens.device.unknown'),
            })}
          </p>

          {report.log && report.log.length > 0 ? (
            // Newest first: the answer to "what just happened" is the last thing
            // written, and nobody should have to scroll a log to reach it.
            <pre className="bg-muted/40 text-secondary max-h-80 overflow-auto rounded-md p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
              {[...report.log].reverse().join('\n')}
            </pre>
          ) : (
            <p className="text-muted-foreground text-xs">{t('screens.device.diagnostics.noLog')}</p>
          )}
        </div>
      ) : null}
    </SettingsSection>
  )
}

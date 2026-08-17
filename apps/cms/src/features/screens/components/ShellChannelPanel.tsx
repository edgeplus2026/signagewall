import { PowerIcon } from 'lucide-react'
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
import { useQueueShellCommand } from '@/features/screens/hooks/useScreens'
import type { ShellStatusReport } from '@/features/screens/types/screen.types'
import {
  SettingsRow,
  SettingsSection,
} from '@/features/settings/components/SettingsSection'
import { getApiErrorMessage } from '@/lib/api-error'

interface ShellChannelPanelProps {
  screenId: string
  status?: ShellStatusReport | undefined
  statusAt?: string | undefined
  /** Whether the player PAGE is talking to us, from the socket presence. */
  pageOnline: boolean
}

/**
 * The native shell's own line to the backend, and the one action that still works
 * when the player page is the broken part.
 *
 * Everything else on this tab talks to the page. When the page is what failed,
 * all of it goes quiet at once and the screen looks simply offline — while the
 * shell underneath is running fine and can say so. That disagreement is the whole
 * reason this panel is separate from the rest.
 */
export function ShellChannelPanel({
  screenId,
  status,
  statusAt,
  pageOnline,
}: ShellChannelPanelProps) {
  const { t } = useTranslation()
  const queue = useQueueShellCommand()
  const [confirmOpen, setConfirmOpen] = useState(false)

  // The state this panel exists for: the shell is checking in, the page is not.
  const pageDead = Boolean(status) && status?.pageAlive === false

  const onRestart = async () => {
    try {
      await queue.mutateAsync({ id: screenId, command: 'restart' })
      setConfirmOpen(false)
      toast.success(t('screens.device.shell.queued'))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('screens.device.shell.error')))
    }
  }

  return (
    <SettingsSection title={t('screens.device.shell.title')}>
      <SettingsRow
        label={t('screens.device.shell.statusTitle')}
        description={t('screens.device.shell.statusDescription')}
      >
        <span className={pageDead ? 'text-warning text-sm' : 'text-secondary text-sm'}>
          {status
            ? t(
                pageDead
                  ? 'screens.device.shell.pageDead'
                  : 'screens.device.shell.pageAlive',
                {
                  at: statusAt
                    ? new Date(statusAt).toLocaleString()
                    : t('screens.device.unknown'),
                },
              )
            : t('screens.device.shell.neverReported')}
        </span>
      </SettingsRow>

      {/* Only when it can do something the ordinary Restart cannot. With the page
          alive, that button is instant and this one waits minutes — offering both
          would only invite picking the slow one. */}
      {pageDead || !pageOnline ? (
        <SettingsRow
          label={t('screens.device.shell.restartTitle')}
          description={t('screens.device.shell.restartDescription')}
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setConfirmOpen(true)
            }}
            disabled={queue.isPending}
          >
            <PowerIcon className="size-4" />
            {t('screens.device.shell.restartButton')}
          </Button>
        </SettingsRow>
      ) : null}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t('screens.device.shell.confirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('screens.device.shell.confirmDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmOpen(false)
              }}
            >
              {t('screens.device.shell.cancel')}
            </Button>
            <Button disabled={queue.isPending} onClick={() => void onRestart()}>
              {t('screens.device.shell.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  )
}

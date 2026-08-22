import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { PlayerInstallInstructions } from '@/features/downloads/components/PlayerInstallInstructions'
import { DeviceSettingsForm } from '@/features/screens/components/DeviceSettingsForm'
import { PairingCodeFrame } from '@/features/screens/components/PairingCodeFrame'
import { PlayerPreviewFrame } from '@/features/screens/components/PlayerPreviewFrame'
import { ScreenPresenceBadge } from '@/features/screens/components/ScreenPresenceBadge'
import { UnpairDeviceDialog } from '@/features/screens/components/UnpairDeviceDialog'
import {
  usePairScreenDevice,
  useScreenDevice,
  useUnpairScreenDevice,
} from '@/features/screens/hooks/useScreens'
import { mergeDeviceSnapshot } from '@/features/screens/lib/deviceFacts'
import { useScreenPresence } from '@/features/screens/providers/presenceContext'
import { DEFAULT_DEVICE_SETTINGS } from '@/features/screens/types/screen.types'
import { SettingsRow, SettingsSection } from '@/features/settings/components/SettingsSection'
import { getApiErrorMessage } from '@/lib/api-error'

interface ScreenDeviceTabProps {
  screenId: string
}

/**
 * Pairs / inspects / unpairs the physical display bound 1:1 to this screen.
 * The player shows a pairing code; the operator enters it here to cast this
 * screen's content to that device. Status is live — it merges the realtime
 * socket presence over the REST snapshot so it never lags an open tab.
 */
export function ScreenDeviceTab({ screenId }: ScreenDeviceTabProps) {
  const { t } = useTranslation()
  const { data: deviceSnapshot } = useScreenDevice(screenId)
  const livePresence = useScreenPresence(screenId)
  const pair = usePairScreenDevice()
  const unpair = useUnpairScreenDevice()
  const [code, setCode] = useState('')
  const [unpairOpen, setUnpairOpen] = useState(false)

  // Shared with the admin tab, and field-wise on purpose — see mergeDeviceSnapshot.
  const device = mergeDeviceSnapshot(deviceSnapshot, livePresence)

  const savedVolume = device?.volume ?? 100
  const savedSettings = device?.settings ?? DEFAULT_DEVICE_SETTINGS

  // Accept the code explicitly so auto-submit (on paste/complete) uses the
  // just-entered value rather than the not-yet-flushed `code` state.
  const onPair = async (submittedCode: string = code) => {
    const trimmed = submittedCode.trim()
    if (!trimmed) return

    try {
      await pair.mutateAsync({ id: screenId, code: trimmed })
      setCode('')
      toast.success(t('screens.device.pair.success'))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('screens.device.pair.error')))
    }
  }

  const onUnpair = async () => {
    try {
      await unpair.mutateAsync(screenId)
      setUnpairOpen(false)
      toast.success(t('screens.device.unpair.success'))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('screens.device.unpair.error')))
    }
  }

  const paired = device?.paired ?? false

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-secondary text-[13px] leading-snug">{t('screens.device.description')}</p>

      {paired ? (
        <div className="flex flex-col gap-7">
          {device?.online ? (
            <div className="flex flex-col gap-2.5">
              {/* The one block on this tab that had no heading, so it floated above
                  the sections instead of reading as the first of them. The string
                  had existed unused since the preview was added. */}
              <h2 className="text-secondary text-[13px] font-medium">
                {t('screens.device.preview.title')}
              </h2>
              <PlayerPreviewFrame
                screenId={screenId}
                orientation={savedSettings.orientation}
                scale={savedSettings.scale}
              />
            </div>
          ) : null}

          <DeviceSettingsForm
            screenId={screenId}
            savedVolume={savedVolume}
            savedSettings={savedSettings}
          />

          <SettingsSection title={t('screens.device.details.title')}>
            <SettingsRow
              label={t('screens.device.status')}
              description={t('screens.device.statusDescription')}
            >
              <ScreenPresenceBadge device={device} />
            </SettingsRow>

            <SettingsRow
              label={t('screens.device.lastSeen')}
              description={t('screens.device.lastSeenDescription')}
            >
              <span className="text-secondary text-sm">
                {device?.lastSeenAt
                  ? new Date(device.lastSeenAt).toLocaleString()
                  : t('screens.device.neverSeen')}
              </span>
            </SettingsRow>
          </SettingsSection>

          <SettingsSection title={t('screens.device.dangerZone.title')}>
            <SettingsRow
              label={t('screens.device.unpair.rowTitle')}
              description={t('screens.device.unpair.rowDescription')}
            >
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  setUnpairOpen(true)
                }}
                disabled={unpair.isPending}
              >
                {t('screens.device.unpair.submit')}
              </Button>
            </SettingsRow>
          </SettingsSection>
        </div>
      ) : (
        <div className="flex flex-col gap-7">
          <PairingCodeFrame
            code={code}
            onChange={setCode}
            onComplete={(value) => void onPair(value)}
            onSubmit={() => void onPair()}
            isPending={pair.isPending}
          />
          {/* A code box on its own assumes the screen already runs the player. On a
              screen that has never been paired the opposite is usually true —
              somebody is standing in front of a television with nothing installed
              on it — so the way to get there belongs directly underneath, not on
              another page they have not found yet. */}
          <PlayerInstallInstructions />
        </div>
      )}

      <UnpairDeviceDialog
        open={unpairOpen}
        onOpenChange={setUnpairOpen}
        onConfirm={() => void onUnpair()}
        isPending={unpair.isPending}
      />
    </div>
  )
}

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
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
import { useScreenPresence } from '@/features/screens/providers/presenceContext'
import {
  DEFAULT_DEVICE_SETTINGS,
  type ScreenDevice,
} from '@/features/screens/types/screen.types'
import {
  SettingsRow,
  SettingsSection,
} from '@/features/settings/components/SettingsSection'
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

  // Merge the two sources rather than letting one shadow the other: the socket
  // presence carries live online/last-seen, while the REST snapshot is the
  // authority for fields presence doesn't push (e.g. volume). Base on whichever
  // exists, then overlay live presence so its status wins without dropping the
  // snapshot's volume.
  const base = livePresence ?? deviceSnapshot
  const device: ScreenDevice | undefined = base
    ? { ...deviceSnapshot, ...livePresence, paired: base.paired, online: base.online }
    : undefined

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
      <p className="text-secondary text-[13px] leading-snug">
        {t('screens.device.description')}
      </p>

      {paired ? (
        <div className="flex flex-col gap-7">
          {device?.online ? (
            <PlayerPreviewFrame
              screenId={screenId}
              orientation={savedSettings.orientation}
              scale={savedSettings.scale}
            />
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

            <SettingsRow
              label={t('screens.device.version')}
              description={t('screens.device.versionDescription')}
            >
              <span className="text-secondary text-sm">
                {device?.profile?.appVersion ?? t('screens.device.unknown')}
              </span>
            </SettingsRow>

            {device?.profile?.shellVersion ? (
              <SettingsRow
                label={t('screens.device.shellVersion')}
                description={t('screens.device.shellVersionDescription')}
              >
                <span className="text-secondary text-sm">
                  {device.profile.shellVersion}
                </span>
              </SettingsRow>
            ) : null}

            {device?.profile?.updateStatus?.lastResult ? (
              <SettingsRow
                label={t('screens.device.updateStatus')}
                description={t('screens.device.updateStatusDescription')}
              >
                <span className="text-secondary text-sm">
                  {t(
                    `screens.device.updateResult.${device.profile.updateStatus.lastResult}`,
                    { defaultValue: device.profile.updateStatus.lastResult },
                  )}
                  {/* Without the target version "Update available" tells the
                      operator nothing actionable — which build is on offer? */}
                  {device.profile.updateStatus.availableVersion
                    ? ` → ${device.profile.updateStatus.availableVersion}`
                    : null}
                </span>
              </SettingsRow>
            ) : null}

            {device?.deviceId ? (
              <SettingsRow
                label={t('screens.device.deviceIdLabel')}
                description={t('screens.device.deviceIdDescription')}
              >
                <span className="text-secondary font-mono text-xs">
                  {device.deviceId}
                </span>
              </SettingsRow>
            ) : null}
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
        <PairingCodeFrame
          code={code}
          onChange={setCode}
          onComplete={(value) => void onPair(value)}
          onSubmit={() => void onPair()}
          isPending={pair.isPending}
        />
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

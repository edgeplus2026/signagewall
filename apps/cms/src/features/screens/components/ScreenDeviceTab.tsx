import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { DeviceVolumeControl } from '@/features/screens/components/DeviceVolumeControl'
import { PairingCodeFrame } from '@/features/screens/components/PairingCodeFrame'
import { ScreenPresenceBadge } from '@/features/screens/components/ScreenPresenceBadge'
import { UnpairDeviceDialog } from '@/features/screens/components/UnpairDeviceDialog'
import {
  usePairScreenDevice,
  useScreenDevice,
  useSetDeviceVolume,
  useUnpairScreenDevice,
} from '@/features/screens/hooks/useScreens'
import { useScreenPresence } from '@/features/screens/providers/presenceContext'
import type { ScreenDevice } from '@/features/screens/types/screen.types'
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
          <DeviceVolumeSettings
            key={savedVolume}
            screenId={screenId}
            savedVolume={savedVolume}
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

interface DeviceVolumeSettingsProps {
  screenId: string
  savedVolume: number
}

/**
 * The "Settings" section: a volume slider committed via Save changes (no live
 * push). Keyed on `savedVolume` by the parent, so it remounts — and the draft
 * resets — whenever the persisted value changes.
 */
function DeviceVolumeSettings({
  screenId,
  savedVolume,
}: DeviceVolumeSettingsProps) {
  const { t } = useTranslation()
  const setVolume = useSetDeviceVolume()
  const [draft, setDraft] = useState(savedVolume)
  const dirty = draft !== savedVolume

  const onSave = async () => {
    try {
      await setVolume.mutateAsync({ id: screenId, volume: draft })
      toast.success(t('screens.device.volume.success'))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('screens.device.volume.error')))
    }
  }

  return (
    <SettingsSection title={t('screens.device.settings.title')}>
      <SettingsRow
        label={t('screens.device.volume.title')}
        description={t('screens.device.volume.description')}
      >
        <DeviceVolumeControl
          value={draft}
          onChange={setDraft}
          disabled={setVolume.isPending}
        />
      </SettingsRow>

      <div className="flex justify-end px-4 py-3">
        <Button
          size="sm"
          onClick={() => void onSave()}
          disabled={!dirty || setVolume.isPending}
        >
          {t('screens.device.settings.save')}
        </Button>
      </div>
    </SettingsSection>
  )
}

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  usePairScreenDevice,
  useScreenDevice,
  useUnpairScreenDevice,
} from '@/features/screens/hooks/useScreens'
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
 * screen's content to that device.
 */
export function ScreenDeviceTab({ screenId }: ScreenDeviceTabProps) {
  const { t } = useTranslation()
  const { data: device } = useScreenDevice(screenId)
  const pair = usePairScreenDevice()
  const unpair = useUnpairScreenDevice()
  const [code, setCode] = useState('')

  const onPair = async () => {
    try {
      await pair.mutateAsync({ id: screenId, code })
      setCode('')
      toast.success(t('screens.device.pair.success'))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('screens.device.pair.error')))
    }
  }

  const onUnpair = async () => {
    try {
      await unpair.mutateAsync(screenId)
      toast.success(t('screens.device.unpair.success'))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('screens.device.unpair.error')))
    }
  }

  const paired = device?.paired ?? false

  return (
    <div className="flex flex-col gap-7">
      <SettingsSection title={t('screens.manage.tabs.device')}>
        {paired ? (
          <>
            <SettingsRow
              label={t('screens.device.status')}
              description={t('screens.device.description')}
            >
              <span
                className={
                  device?.online ? 'text-success text-sm' : 'text-secondary text-sm'
                }
              >
                {device?.online
                  ? t('screens.device.online')
                  : t('screens.device.offline')}
              </span>
            </SettingsRow>

            {device?.lastSeenAt ? (
              <SettingsRow label={t('screens.device.lastSeen')}>
                <span className="text-secondary text-sm">
                  {new Date(device.lastSeenAt).toLocaleString()}
                </span>
              </SettingsRow>
            ) : null}

            {device?.profile?.appVersion ? (
              <SettingsRow label={t('screens.device.version')}>
                <span className="text-secondary text-sm">
                  {device.profile.appVersion}
                </span>
              </SettingsRow>
            ) : null}

            <div className="flex justify-end px-4 py-3">
              <Button
                variant="danger"
                size="sm"
                onClick={() => void onUnpair()}
                disabled={unpair.isPending}
              >
                {t('screens.device.unpair.submit')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <SettingsRow
              label={t('screens.device.code')}
              description={t('screens.device.codeHint')}
              field
            >
              <Input
                value={code}
                onChange={(event) => {
                  setCode(event.currentTarget.value)
                }}
                placeholder="ABC-D29"
                autoComplete="off"
                autoCapitalize="characters"
              />
            </SettingsRow>

            <div className="flex justify-end px-4 py-3">
              <Button
                size="sm"
                onClick={() => void onPair()}
                disabled={!code.trim() || pair.isPending}
              >
                {t('screens.device.pair.submit')}
              </Button>
            </div>
          </>
        )}
      </SettingsSection>
    </div>
  )
}

import { RotateCwIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { DeviceVolumeControl } from '@/features/screens/components/DeviceVolumeControl'
import {
  useRestartDevice,
  useSetDeviceDailyReload,
  useSetDeviceKioskMode,
  useSetDeviceOrientation,
  useSetDeviceScale,
  useSetDeviceVolume,
} from '@/features/screens/hooks/useScreens'
import type {
  ScreenDeviceKioskMode,
  ScreenDeviceOrientation,
  ScreenDeviceScale,
  ScreenDeviceSettings,
} from '@/features/screens/types/screen.types'
import {
  SettingsRow,
  SettingsSection,
} from '@/features/settings/components/SettingsSection'
import { getApiErrorMessage } from '@/lib/api-error'

const ORIENTATION_OPTIONS: readonly ScreenDeviceOrientation[] = [
  'landscape',
  'landscape-flipped',
  'portrait',
  'portrait-flipped',
]

const SCALE_OPTIONS: readonly ScreenDeviceScale[] = [
  'none',
  'fit',
  'stretch',
  'zoom',
]

const KIOSK_MODE_OPTIONS: readonly ScreenDeviceKioskMode[] = [
  'hard',
  'soft',
  'off',
]

interface DeviceSettingsFormProps {
  screenId: string
  savedVolume: number
  savedSettings: ScreenDeviceSettings
}

/**
 * The device settings tab body: a "Display" section (volume + orientation +
 * scale, committed together) and a "Maintenance" section (restart + daily
 * reload). The two sections are split into independently-keyed components so
 * saving one never remounts (and resets the unsaved drafts of) the other.
 */
export function DeviceSettingsForm({
  screenId,
  savedVolume,
  savedSettings,
}: DeviceSettingsFormProps) {
  return (
    <div className="flex flex-col gap-7">
      <DisplaySettings
        key={`display-${String(savedVolume)}-${savedSettings.orientation}-${savedSettings.scale}`}
        screenId={screenId}
        savedVolume={savedVolume}
        savedOrientation={savedSettings.orientation}
        savedScale={savedSettings.scale}
      />
      <KioskSettings
        key={`kiosk-${savedSettings.kioskMode}`}
        screenId={screenId}
        savedKioskMode={savedSettings.kioskMode}
      />
      <MaintenanceSettings
        key={`maintenance-${savedSettings.dailyReload.enabled ? 'on' : 'off'}-${savedSettings.dailyReload.time}`}
        screenId={screenId}
        savedReloadEnabled={savedSettings.dailyReload.enabled}
        savedReloadTime={savedSettings.dailyReload.time}
      />
    </div>
  )
}

interface KioskSettingsProps {
  screenId: string
  savedKioskMode: ScreenDeviceKioskMode
}

/**
 * Kiosk lockdown for the bound device (enforced by the Android native shell;
 * a no-op on browser/desktop players). Its own section + save, so it never
 * remounts the Display or Maintenance drafts when committed.
 */
function KioskSettings({ screenId, savedKioskMode }: KioskSettingsProps) {
  const { t } = useTranslation()
  const setKioskMode = useSetDeviceKioskMode()

  const [kioskMode, setKioskModeDraft] = useState(savedKioskMode)
  const dirty = kioskMode !== savedKioskMode

  const onSave = async () => {
    try {
      await setKioskMode.mutateAsync({ id: screenId, kioskMode })
      toast.success(t('screens.device.kiosk.success'))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('screens.device.kiosk.error')))
    }
  }

  return (
    <SettingsSection title={t('screens.device.kiosk.title')}>
      <SettingsRow
        label={t('screens.device.kioskMode.title')}
        description={t('screens.device.kioskMode.description')}
      >
        <SettingSelect
          value={kioskMode}
          options={KIOSK_MODE_OPTIONS}
          i18nPrefix="screens.device.kioskMode.options"
          disabled={setKioskMode.isPending}
          onChange={setKioskModeDraft}
        />
      </SettingsRow>

      <div className="flex justify-end px-4 py-3">
        <Button
          size="sm"
          onClick={() => void onSave()}
          disabled={!dirty || setKioskMode.isPending}
        >
          {t('screens.device.settings.save')}
        </Button>
      </div>
    </SettingsSection>
  )
}

interface SettingSelectProps<T extends string> {
  value: T
  options: readonly T[]
  i18nPrefix: string
  disabled?: boolean
  onChange: (value: T) => void
}

/** A labeled enum dropdown whose option labels come from an i18n prefix. */
function SettingSelect<T extends string>({
  value,
  options,
  i18nPrefix,
  disabled,
  onChange,
}: SettingSelectProps<T>) {
  const { t } = useTranslation()
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        onChange(next as T)
      }}
      disabled={disabled ?? false}
    >
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {t(`${i18nPrefix}.${option}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

interface DisplaySettingsProps {
  screenId: string
  savedVolume: number
  savedOrientation: ScreenDeviceOrientation
  savedScale: ScreenDeviceScale
}

function DisplaySettings({
  screenId,
  savedVolume,
  savedOrientation,
  savedScale,
}: DisplaySettingsProps) {
  const { t } = useTranslation()
  const setVolume = useSetDeviceVolume()
  const setOrientation = useSetDeviceOrientation()
  const setScale = useSetDeviceScale()

  const [volume, setVolumeDraft] = useState(savedVolume)
  const [orientation, setOrientationDraft] = useState(savedOrientation)
  const [scale, setScaleDraft] = useState(savedScale)

  const saving =
    setVolume.isPending || setOrientation.isPending || setScale.isPending
  const dirty =
    volume !== savedVolume ||
    orientation !== savedOrientation ||
    scale !== savedScale

  const onSave = async () => {
    try {
      const pending: Promise<unknown>[] = []
      if (volume !== savedVolume) {
        pending.push(setVolume.mutateAsync({ id: screenId, volume }))
      }
      if (orientation !== savedOrientation) {
        pending.push(setOrientation.mutateAsync({ id: screenId, orientation }))
      }
      if (scale !== savedScale) {
        pending.push(setScale.mutateAsync({ id: screenId, scale }))
      }
      await Promise.all(pending)
      toast.success(t('screens.device.settings.success'))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('screens.device.settings.error')))
    }
  }

  return (
    <SettingsSection title={t('screens.device.settings.title')}>
      <SettingsRow
        label={t('screens.device.volume.title')}
        description={t('screens.device.volume.description')}
      >
        <DeviceVolumeControl
          value={volume}
          onChange={setVolumeDraft}
          disabled={saving}
        />
      </SettingsRow>

      <SettingsRow
        label={t('screens.device.orientation.title')}
        description={t('screens.device.orientation.description')}
      >
        <SettingSelect
          value={orientation}
          options={ORIENTATION_OPTIONS}
          i18nPrefix="screens.device.orientation.options"
          disabled={saving}
          onChange={setOrientationDraft}
        />
      </SettingsRow>

      <SettingsRow
        label={t('screens.device.scale.title')}
        description={t('screens.device.scale.description')}
      >
        <SettingSelect
          value={scale}
          options={SCALE_OPTIONS}
          i18nPrefix="screens.device.scale.options"
          disabled={saving}
          onChange={setScaleDraft}
        />
      </SettingsRow>

      <div className="flex justify-end px-4 py-3">
        <Button
          size="sm"
          onClick={() => void onSave()}
          disabled={!dirty || saving}
        >
          {t('screens.device.settings.save')}
        </Button>
      </div>
    </SettingsSection>
  )
}

interface MaintenanceSettingsProps {
  screenId: string
  savedReloadEnabled: boolean
  savedReloadTime: string
}

function MaintenanceSettings({
  screenId,
  savedReloadEnabled,
  savedReloadTime,
}: MaintenanceSettingsProps) {
  const { t } = useTranslation()
  const setDailyReload = useSetDeviceDailyReload()
  const restart = useRestartDevice()

  const [reloadEnabled, setReloadEnabled] = useState(savedReloadEnabled)
  const [reloadTime, setReloadTime] = useState(savedReloadTime)

  const reloadDirty =
    reloadEnabled !== savedReloadEnabled || reloadTime !== savedReloadTime

  const onSaveReload = async () => {
    try {
      await setDailyReload.mutateAsync({
        id: screenId,
        payload: { enabled: reloadEnabled, time: reloadTime },
      })
      toast.success(t('screens.device.dailyReload.success'))
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, t('screens.device.dailyReload.error')),
      )
    }
  }

  const onRestart = async () => {
    try {
      await restart.mutateAsync(screenId)
      toast.success(t('screens.device.restart.success'))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('screens.device.restart.error')))
    }
  }

  return (
    <SettingsSection title={t('screens.device.maintenance.title')}>
      <SettingsRow
        label={t('screens.device.restart.title')}
        description={t('screens.device.restart.description')}
      >
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void onRestart()}
          disabled={restart.isPending}
        >
          <RotateCwIcon className="size-4" />
          {t('screens.device.restart.button')}
        </Button>
      </SettingsRow>

      <SettingsRow
        label={t('screens.device.dailyReload.title')}
        description={t('screens.device.dailyReload.description')}
      >
        <div className="flex items-center gap-3">
          <Input
            type="time"
            value={reloadTime}
            disabled={!reloadEnabled || setDailyReload.isPending}
            className="w-28"
            aria-label={t('screens.device.dailyReload.timeLabel')}
            onChange={(event) => {
              setReloadTime(event.target.value)
            }}
          />
          <Switch
            checked={reloadEnabled}
            disabled={setDailyReload.isPending}
            aria-label={t('screens.device.dailyReload.enabledLabel')}
            onCheckedChange={setReloadEnabled}
          />
        </div>
      </SettingsRow>

      <div className="flex justify-end px-4 py-3">
        <Button
          size="sm"
          onClick={() => void onSaveReload()}
          disabled={!reloadDirty || setDailyReload.isPending}
        >
          {t('screens.device.settings.save')}
        </Button>
      </div>
    </SettingsSection>
  )
}

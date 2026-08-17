import { DownloadIcon, RotateCwIcon } from 'lucide-react'
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
import { useIsSuperAdmin } from '@/features/auth/hooks/useIsSuperAdmin'
import { ApplyDeviceUpdateDialog } from '@/features/screens/components/ApplyDeviceUpdateDialog'
import { DeviceVolumeControl } from '@/features/screens/components/DeviceVolumeControl'
import {
  useApplyDeviceUpdate,
  useRestartDevice,
  useSetDeviceDailyReload,
  useSetDeviceOrientation,
  useSetDeviceScale,
  useSetDeviceVolume,
} from '@/features/screens/hooks/useScreens'
import type {
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
 *
 * Kiosk lockdown is deliberately absent: it is set on the device itself, in the
 * player's service menu. Locking a screen from here means locking a box nobody is
 * standing next to — and if the lock misbehaves, the one person who could undo it
 * is the one person this control was hidden from.
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
      <MaintenanceSettings
        key={`maintenance-${savedSettings.dailyReload.enabled ? 'on' : 'off'}-${savedSettings.dailyReload.time}`}
        screenId={screenId}
        savedReloadEnabled={savedSettings.dailyReload.enabled}
        savedReloadTime={savedSettings.dailyReload.time}
      />
    </div>
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
  const isSuperAdmin = useIsSuperAdmin()
  const setDailyReload = useSetDeviceDailyReload()
  const restart = useRestartDevice()
  const applyUpdate = useApplyDeviceUpdate()
  const [updateOpen, setUpdateOpen] = useState(false)

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

  const onApplyUpdate = async () => {
    try {
      await applyUpdate.mutateAsync(screenId)
      setUpdateOpen(false)
      toast.success(t('screens.device.applyUpdate.success'))
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, t('screens.device.applyUpdate.error')),
      )
    }
  }

  // Restarting a display, forcing a shell update and setting the nightly reload
  // are maintenance, not configuration: three ways to make a working screen go
  // blank for a few seconds, offered to somebody with no way to tell whether they
  // are needed. Display settings above stay — those are the customer's to set.
  if (!isSuperAdmin) {
    return null
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
        label={t('screens.device.applyUpdate.title')}
        description={t('screens.device.applyUpdate.rowDescription')}
      >
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setUpdateOpen(true)
          }}
          disabled={applyUpdate.isPending}
        >
          <DownloadIcon className="size-4" />
          {t('screens.device.applyUpdate.button')}
        </Button>
      </SettingsRow>

      <ApplyDeviceUpdateDialog
        open={updateOpen}
        onOpenChange={setUpdateOpen}
        onConfirm={() => void onApplyUpdate()}
        isPending={applyUpdate.isPending}
      />

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

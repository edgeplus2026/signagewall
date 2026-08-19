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
  DeviceUpdateStatus,
  ScreenDeviceOrientation,
  ScreenDeviceScale,
  ScreenDeviceSettings,
} from '@/features/screens/types/screen.types'
import { SettingsRow, SettingsSection } from '@/features/settings/components/SettingsSection'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'

const ORIENTATION_OPTIONS: readonly ScreenDeviceOrientation[] = [
  'landscape',
  'landscape-flipped',
  'portrait',
  'portrait-flipped',
]

const SCALE_OPTIONS: readonly ScreenDeviceScale[] = ['none', 'fit', 'stretch', 'zoom']

interface DeviceSettingsFormProps {
  screenId: string
  savedVolume: number
  savedSettings: ScreenDeviceSettings
}

interface MaintenanceSectionsProps {
  screenId: string
  savedSettings: ScreenDeviceSettings
  /**
   * Whether the player PAGE is connected. Maintenance actions ride the live socket,
   * so on an offline screen they are dropped on the floor rather than queued — the
   * operator has to be told that, not handed a success toast.
   */
  pageOnline: boolean
  /** The device's own view of its update state, so the action can sit beside it. */
  updateStatus?: DeviceUpdateStatus | undefined
}

/**
 * The customer-facing device settings: volume, orientation and scale, committed
 * together. These are physical facts about an installation that the owner knows
 * better than we do, which is why they are the one part of the device surface that
 * was never gated.
 *
 * Maintenance (restart / install update / nightly reload) lives in
 * {@link DeviceMaintenanceSections} on the admin tab instead — three ways to make a
 * working screen go blank, offered to somebody with no way to tell whether they are
 * needed.
 *
 * Kiosk lockdown is deliberately absent from both: it is set on the device itself,
 * in the player's service menu. Locking a screen from here means locking a box
 * nobody is standing next to — and if the lock misbehaves, the one person who could
 * undo it is the one person this control was hidden from.
 */
export function DeviceSettingsForm({
  screenId,
  savedVolume,
  savedSettings,
}: DeviceSettingsFormProps) {
  return (
    <DisplaySettings
      key={`display-${String(savedVolume)}-${savedSettings.orientation}-${savedSettings.scale}`}
      screenId={screenId}
      savedVolume={savedVolume}
      savedOrientation={savedSettings.orientation}
      savedScale={savedSettings.scale}
    />
  )
}

/**
 * The admin tab's "Updates" and "Maintenance" sections.
 *
 * Update STATE and the update ACTION now sit in one section. They used to be four
 * sections apart and on opposite sides of a permission gate, so a customer read
 * "Update available → 1.4.2" with no way to act while an admin pressed a button
 * that gave no hint whether anything was pending.
 */
export function DeviceMaintenanceSections({
  screenId,
  savedSettings,
  pageOnline,
  updateStatus,
}: MaintenanceSectionsProps) {
  return (
    <MaintenanceSettings
      key={`maintenance-${savedSettings.dailyReload.enabled ? 'on' : 'off'}-${savedSettings.dailyReload.time}`}
      screenId={screenId}
      savedReloadEnabled={savedSettings.dailyReload.enabled}
      savedReloadTime={savedSettings.dailyReload.time}
      pageOnline={pageOnline}
      updateStatus={updateStatus}
    />
  )
}

interface SettingSelectProps<T extends string> {
  value: T
  options: readonly T[]
  i18nPrefix: string
  disabled?: boolean
  onChange: (value: T) => void
}

/**
 * OTA outcomes an operator has to act on. `needs-operator` belongs here above all:
 * it is the only one that literally means "send somebody to this screen", and it
 * used to render in the same calm grey as ordinary news.
 */
const UPDATE_NEEDS_ATTENTION = new Set(['error', 'unhealthy', 'needs-operator'])

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

  const saving = setVolume.isPending || setOrientation.isPending || setScale.isPending
  const dirty = volume !== savedVolume || orientation !== savedOrientation || scale !== savedScale

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
        <DeviceVolumeControl value={volume} onChange={setVolumeDraft} disabled={saving} />
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
        <Button size="sm" onClick={() => void onSave()} disabled={!dirty || saving}>
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
  pageOnline: boolean
  updateStatus?: DeviceUpdateStatus | undefined
}

function MaintenanceSettings({
  screenId,
  savedReloadEnabled,
  savedReloadTime,
  pageOnline,
  updateStatus,
}: MaintenanceSettingsProps) {
  const { t } = useTranslation()
  const isSuperAdmin = useIsSuperAdmin()
  const setDailyReload = useSetDeviceDailyReload()
  const restart = useRestartDevice()
  const applyUpdate = useApplyDeviceUpdate()
  const [updateOpen, setUpdateOpen] = useState(false)

  const [reloadEnabled, setReloadEnabled] = useState(savedReloadEnabled)
  const [reloadTime, setReloadTime] = useState(savedReloadTime)

  const reloadDirty = reloadEnabled !== savedReloadEnabled || reloadTime !== savedReloadTime

  const onSaveReload = async () => {
    try {
      await setDailyReload.mutateAsync({
        id: screenId,
        payload: { enabled: reloadEnabled, time: reloadTime },
      })
      toast.success(t('screens.device.dailyReload.success'))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('screens.device.dailyReload.error')))
    }
  }

  const onRestart = async () => {
    try {
      await restart.mutateAsync(screenId)
      // No offline branch here, unlike the update below: this row only renders while
      // the page is online, because an offline screen is handed the shell channel's
      // queued restart instead. A second message for a state the button cannot be
      // pressed in would just be untested code.
      toast.success(t('screens.device.restart.success'))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('screens.device.restart.error')))
    }
  }

  const onApplyUpdate = async () => {
    try {
      await applyUpdate.mutateAsync(screenId)
      setUpdateOpen(false)
      // A 200 proves the screen is ours, NOT that the command reached it: the
      // backend resolves ownership and then emits onto the socket, where an
      // unconnected device's room is simply empty and the command is dropped. Say
      // which of the two actually happened.
      if (pageOnline) {
        toast.success(t('screens.device.applyUpdate.success'))
      } else {
        toast.warning(t('screens.device.applyUpdate.offline'))
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('screens.device.applyUpdate.error')))
    }
  }

  // Restarting a display, forcing a shell update and setting the nightly reload
  // are maintenance, not configuration: three ways to make a working screen go
  // blank for a few seconds, offered to somebody with no way to tell whether they
  // are needed. Display settings above stay — those are the customer's to set.
  if (!isSuperAdmin) {
    return null
  }

  // Shown, never enforced. `updateStatus` is only as fresh as the last heartbeat
  // the page sent, so it is stale in exactly the situation this button exists for:
  // you published a release seconds ago and want to pilot it on your own screen.
  // The device re-reads the channel when asked — "install now has to mean go and
  // look now", as OtaUpdater puts it — so disabling on a stale `up-to-date` would
  // block the documented main use and, worse, claim the screen is on the newest
  // build when it demonstrably is not.
  const reportedUpToDate = updateStatus?.lastResult === 'up-to-date'

  return (
    <>
      <SettingsSection title={t('screens.device.admin.updates.title')}>
        {updateStatus?.lastResult ? (
          <SettingsRow
            label={t('screens.device.updateStatus')}
            description={t('screens.device.updateStatusDescription')}
          >
            <span
              className={cn(
                'text-sm',
                UPDATE_NEEDS_ATTENTION.has(updateStatus.lastResult)
                  ? 'text-warning'
                  : 'text-secondary',
              )}
            >
              {t(`screens.device.updateResult.${updateStatus.lastResult}`, {
                defaultValue: updateStatus.lastResult,
              })}
              {/* Without the target version "Update available" tells the operator
                  nothing actionable — which build is on offer? */}
              {updateStatus.availableVersion ? ` → ${updateStatus.availableVersion}` : null}
            </span>
          </SettingsRow>
        ) : null}

        <SettingsRow
          label={t('screens.device.applyUpdate.title')}
          description={
            reportedUpToDate
              ? t('screens.device.applyUpdate.upToDateDescription')
              : t('screens.device.applyUpdate.rowDescription')
          }
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
      </SettingsSection>

      <SettingsSection title={t('screens.device.maintenance.title')}>
        {/* Only while the page is up. This restart rides the socket, so on an
            offline screen it cannot arrive — and that is exactly when the shell
            channel offers its own queued restart. Offering both was the confusing
            half of a de-duplication that was only ever implemented on one side. */}
        {pageOnline ? (
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
        ) : null}

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
            {/* Its own key: this saves the reload time and nothing else, while the
                Display section's Save commits volume/orientation/scale. One shared
                string across two disjoint saves is how "I pressed Restart, do I now
                press Save?" happens. */}
            {t('screens.device.dailyReload.save')}
          </Button>
        </div>
      </SettingsSection>
    </>
  )
}

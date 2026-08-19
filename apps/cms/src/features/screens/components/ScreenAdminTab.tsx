import { useTranslation } from 'react-i18next'

import { useIsSuperAdmin } from '@/features/auth/hooks/useIsSuperAdmin'
import { DeviceDiagnosticsPanel } from '@/features/screens/components/DeviceDiagnosticsPanel'
import { DeviceMaintenanceSections } from '@/features/screens/components/DeviceSettingsForm'
import { ShellChannelPanel } from '@/features/screens/components/ShellChannelPanel'
import { useScreenDevice } from '@/features/screens/hooks/useScreens'
import {
  formatFreeSpace,
  freeDiskOf,
  lastCrashOf,
  mergeDeviceSnapshot,
  recoveriesOf,
  shellVersionDisagreement,
  shellVersionOf,
  type FactSource,
} from '@/features/screens/lib/deviceFacts'
import { useScreenPresence } from '@/features/screens/providers/presenceContext'
import { DEFAULT_DEVICE_SETTINGS } from '@/features/screens/types/screen.types'
import { SettingsRow, SettingsSection } from '@/features/settings/components/SettingsSection'

interface ScreenAdminTabProps {
  screenId: string
}

/**
 * Everything about a paired display that only somebody maintaining players needs.
 *
 * It exists because the device tab had grown twelve read-only telemetry rows —
 * cache counts, a lifetime recovery counter, a raw crash breadcrumb, a service
 * worker, Device Owner provisioning — sitting completely ungated next to three
 * sections that were already super-admin only. To the person who owns the screen
 * none of it was actionable, several rows were permanently amber on a perfectly
 * healthy display, and two of them answered "is it online?" differently from the
 * badge directly above.
 *
 * The gate lives here rather than at the call site, matching the idiom the rest of
 * this feature uses, so a section added later cannot forget it.
 */
export function ScreenAdminTab({ screenId }: ScreenAdminTabProps) {
  const { t } = useTranslation()
  const isSuperAdmin = useIsSuperAdmin()
  const { data: deviceSnapshot } = useScreenDevice(screenId)
  const livePresence = useScreenPresence(screenId)
  const device = mergeDeviceSnapshot(deviceSnapshot, livePresence)

  if (!isSuperAdmin) {
    return null
  }

  if (!device?.paired) {
    return (
      <p className="text-secondary text-[13px] leading-snug">
        {t('screens.device.admin.description')}
      </p>
    )
  }

  const shellVersion = shellVersionOf(device)
  const otherShellVersion = shellVersionDisagreement(device)
  const freeDisk = freeDiskOf(device)
  const recoveries = recoveriesOf(device)
  const lastCrash = lastCrashOf(device)
  const cache = device.profile?.diagnostics
  const pageOnline = device.online

  /** Names the channel a number came from, so a stale reading is legible as stale. */
  const via = (source: FactSource) =>
    t(
      source === 'shell'
        ? 'screens.device.admin.versions.viaShell'
        : source === 'page'
          ? 'screens.device.admin.versions.viaPage'
          : 'screens.device.admin.versions.viaReport',
    )

  return (
    <div className="flex flex-col gap-4">
      <p className="text-secondary text-[13px] leading-snug">
        {t('screens.device.admin.description')}
      </p>

      <div className="flex flex-col gap-7">
        <SettingsSection title={t('screens.device.admin.connection.title')}>
          <SettingsRow
            label={t('screens.device.lastSeen')}
            description={t('screens.device.lastSeenDescription')}
          >
            <span className="text-secondary text-sm">
              {device.lastSeenAt
                ? new Date(device.lastSeenAt).toLocaleString()
                : t('screens.device.neverSeen')}
            </span>
          </SettingsRow>

          {device.deviceId ? (
            <SettingsRow
              label={t('screens.device.deviceIdLabel')}
              description={t('screens.device.deviceIdDescription')}
            >
              <span className="text-secondary font-mono text-xs">{device.deviceId}</span>
            </SettingsRow>
          ) : null}
        </SettingsSection>

        <SettingsSection title={t('screens.device.admin.versions.title')}>
          <SettingsRow
            label={t('screens.device.version')}
            description={t('screens.device.versionDescription')}
          >
            <span className="text-secondary text-sm">
              {device.profile?.appVersion ?? t('screens.device.unknown')}
            </span>
          </SettingsRow>

          {shellVersion ? (
            <SettingsRow
              label={t('screens.device.shellVersion')}
              description={t('screens.device.shellVersionDescription')}
            >
              <span className="text-secondary text-right text-sm">
                {shellVersion.value}
                <span className="text-muted-foreground block text-xs">
                  {via(shellVersion.source)}
                </span>
                {/* Not noise: the two channels disagreeing means the page has not
                    reloaded since the shell updated itself, which is a real fault
                    and used to be hidden behind whichever value happened to win. */}
                {otherShellVersion ? (
                  <span className="text-warning block text-xs">
                    {t('screens.device.admin.versions.disagree', {
                      version: otherShellVersion,
                    })}
                  </span>
                ) : null}
              </span>
            </SettingsRow>
          ) : null}
        </SettingsSection>

        <DeviceMaintenanceSections
          screenId={screenId}
          savedSettings={device.settings ?? DEFAULT_DEVICE_SETTINGS}
          pageOnline={pageOnline}
          updateStatus={device.profile?.updateStatus}
        />

        <ShellChannelPanel
          screenId={screenId}
          status={device.shellStatus}
          statusAt={device.shellStatusAt}
          pageOnline={pageOnline}
        />

        <SettingsSection title={t('screens.device.admin.health.title')}>
          {/* One row, not two. "Offline copy" and "Offline cache" were adjacent
              rows with near-identical labels about the same subsystem — a count and
              a scare sentence. An uncontrolled worker caches nothing at all, so it
              belongs here as the warning on the very row that claims the screen can
              survive without a network. */}
          {cache?.totalMedia !== undefined || cache?.serviceWorkerControlled === false ? (
            <SettingsRow
              label={t('screens.device.cache.title')}
              description={t('screens.device.cache.description')}
            >
              <span className="text-right text-sm">
                {cache.totalMedia !== undefined ? (
                  <span className={cache.cacheComplete ? 'text-secondary' : 'text-warning'}>
                    {t('screens.device.cache.value', {
                      cached: cache.cachedMedia ?? 0,
                      total: cache.totalMedia,
                    })}
                  </span>
                ) : null}
                {cache.serviceWorkerControlled === false ? (
                  <span className="text-warning block text-xs">
                    {t('screens.device.worker.uncontrolled')}
                  </span>
                ) : null}
              </span>
            </SettingsRow>
          ) : null}

          {freeDisk ? (
            <SettingsRow
              label={t('screens.device.storage.title')}
              description={t('screens.device.storage.description')}
            >
              <span className="text-secondary text-right text-sm">
                {formatFreeSpace(freeDisk.value)}
                <span className="text-muted-foreground block text-xs">{via(freeDisk.source)}</span>
              </span>
            </SettingsRow>
          ) : null}

          {/* Only when the screen has actually struggled. A zero is the normal
              state and needs no row — but a count that keeps climbing is the only
              trace an overnight recovery loop leaves behind, since the ladder
              resets itself once the player is back. */}
          {recoveries && recoveries.value > 0 ? (
            <SettingsRow
              label={t('screens.device.recoveries.title')}
              description={t('screens.device.recoveries.description')}
            >
              <span className="text-warning text-right text-sm">
                {t('screens.device.recoveries.value', {
                  count: recoveries.value,
                })}
                <span className="text-muted-foreground block text-xs">
                  {via(recoveries.source)}
                </span>
              </span>
            </SettingsRow>
          ) : null}

          {lastCrash ? (
            <SettingsRow
              label={t('screens.device.lastCrash.title')}
              description={t('screens.device.lastCrash.description')}
            >
              <span className="text-warning max-w-80 text-right text-sm">
                {lastCrash.value.message}
                {lastCrash.value.at ? (
                  <span className="text-muted-foreground block text-xs">
                    {new Date(lastCrash.value.at).toLocaleString()}
                  </span>
                ) : null}
              </span>
            </SettingsRow>
          ) : null}

          {/* Only on a confirmed `false`. A shell too old to report it says
              nothing, and guessing there would put a warning on screens that may
              well be fine — across a whole fleet that is how an operator learns to
              ignore the column. */}
          {device.profile?.deviceOwner === false ? (
            <SettingsRow
              label={t('screens.device.kioskCapability')}
              description={t('screens.device.kioskCapabilityDescription')}
            >
              <span className="text-warning text-sm">
                {t('screens.device.kioskCapabilityLimited')}
              </span>
            </SettingsRow>
          ) : null}
        </SettingsSection>

        <DeviceDiagnosticsPanel
          screenId={screenId}
          report={device.diagnostics}
          shellLog={device.shellStatus?.log}
          shellLogAt={device.shellStatusAt}
        />
      </div>
    </div>
  )
}

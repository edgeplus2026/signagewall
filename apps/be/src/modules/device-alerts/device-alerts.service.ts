import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DateTime } from 'luxon';
import { I18nService } from 'nestjs-i18n';

import { NotificationsService } from '../notifications/notifications.service';
import {
  AlertRecipientRole,
  OrgAlertSettings,
  resolveOrgAlertSettings,
} from '../organizations/schemas/organization.schema';
import { OrganizationRole } from '../organizations/schemas/organization-membership.schema';
import { OrganizationsRepository } from '../organizations/organizations.repository';
import { DevicesRepository } from '../player/devices.repository';
import { PlayerEvents } from '../player/player.events';
import type { DevicePresenceChangedEvent } from '../player/player.events';
import { DeviceDocument } from '../player/schemas/device.schema';
import { ScreensRepository } from '../screens/screens.repository';
import { ScreenDocument } from '../screens/schemas/screen.schema';
import { AvailabilityEvaluator } from '../screens/availability/availability.evaluator';

const MS_PER_MINUTE = 60_000;
const DEFAULT_TIMEZONE = 'UTC';
type Lang = 'en' | 'sr';

/** Maps a configured recipient role onto the actual membership roles it covers. */
const expandRecipientRoles = (
  roles: AlertRecipientRole[],
): Set<OrganizationRole> => {
  const set = new Set<OrganizationRole>();
  for (const role of roles) {
    if (role === 'admin') {
      set.add(OrganizationRole.ADMIN);
      set.add(OrganizationRole.OWNER);
    } else if (role === 'member') {
      set.add(OrganizationRole.MEMBER);
    }
  }
  return set;
};

/**
 * Detects devices that have been offline past the per-org threshold and raises
 * a single in-app alert per incident (reusing the notifications inbox), then a
 * recovery notification when the device returns. Robust across BE restarts: the
 * incident state lives on the device document, and the offline alert is claimed
 * atomically (one alert per incident, even with overlapping sweeps / multiple BE
 * instances). The recovery alert is sent *before* the incident is cleared, so a
 * transient send failure leaves the incident open to be retried on the next
 * reconnect rather than silently lost — at the cost of a rare duplicate recovery
 * if two reconnect events for the same device race.
 */
@Injectable()
export class DeviceAlertsService {
  private readonly logger = new Logger(DeviceAlertsService.name);

  constructor(
    private readonly devicesRepository: DevicesRepository,
    private readonly screensRepository: ScreensRepository,
    private readonly organizationsRepository: OrganizationsRepository,
    private readonly notificationsService: NotificationsService,
    private readonly availabilityEvaluator: AvailabilityEvaluator,
    private readonly i18n: I18nService,
  ) {}

  /**
   * One pass over offline-not-yet-alerted devices. Each device is evaluated
   * independently; a failure on one is logged and does not abort the sweep.
   */
  async sweep(now: Date = new Date()): Promise<void> {
    const candidates = await this.devicesRepository.findOfflineNotAlerted();
    for (const device of candidates) {
      try {
        await this.evaluateOffline(device, now);
      } catch (error) {
        this.logger.error(
          `Offline-alert evaluation failed for device ${device.deviceId}`,
          error,
        );
      }
    }
  }

  private async evaluateOffline(
    device: DeviceDocument,
    now: Date,
  ): Promise<void> {
    const organizationId = device.organizationId?.toString();
    const screenId = device.screenId?.toString();
    const lastSeenAt = device.lastSeenAt;
    if (!organizationId || !screenId || !lastSeenAt) {
      return;
    }

    const settings = await this.loadSettings(organizationId);
    if (!settings.enabled) {
      return;
    }

    const offlineMs = now.getTime() - lastSeenAt.getTime();
    if (offlineMs < settings.offlineThresholdMin * MS_PER_MINUTE) {
      return; // not offline long enough yet
    }

    const screen = await this.screensRepository.findById(
      organizationId,
      screenId,
    );
    if (!screen || screen.alertMuted) {
      return;
    }

    if (
      settings.respectAvailability &&
      !this.availabilityEvaluator.isOnAt(screen.availability, now)
    ) {
      return; // screen is in a scheduled off-window — not an incident
    }

    const recipientUserIds = await this.resolveRecipients(
      organizationId,
      settings.recipientRoles,
    );
    if (recipientUserIds.length === 0) {
      return; // nobody to notify — leave unclaimed so it can fire later
    }

    // Open the incident first (atomic, one winner) so concurrent sweeps / BE
    // instances can't both alert. Roll back if the notification fails to send.
    const claimed = await this.devicesRepository.claimOfflineAlert(
      device.deviceId,
      lastSeenAt,
      now,
    );
    if (!claimed) {
      return;
    }

    try {
      await this.notificationsService.createSystemNotification({
        kind: 'device-offline',
        recipientUserIds,
        translations: this.buildTranslations((lang) => ({
          title: this.i18n.t('notifications.deviceOffline.title', {
            lang,
            args: {
              name: screen.name,
              since: this.formatInstant(lastSeenAt, screen, lang),
            },
          }),
        })),
        meta: {
          organizationId,
          screenId,
          deviceId: device.deviceId,
          offlineSince: lastSeenAt,
        },
      });
      this.logger.log(
        `Offline alert raised for screen "${screen.name}" (device ${device.deviceId})`,
      );
    } catch (error) {
      // Reopen the incident so the next sweep retries rather than losing it.
      await this.devicesRepository.clearOfflineAlert(device.deviceId);
      throw error;
    }
  }

  /**
   * Recovery: when a device with an open incident comes back online, close the
   * incident and post a "recovered" notification with the measured downtime.
   */
  @OnEvent(PlayerEvents.DevicePresenceChanged)
  async onPresenceChanged(event: DevicePresenceChangedEvent): Promise<void> {
    // Only react to a real offline→online transition (a fresh connection), not
    // the periodic heartbeat that re-emits `online: true` every ~30s — that
    // would otherwise run a clear-incident query per heartbeat per device.
    if (!event.online || !event.reconnected) {
      return;
    }
    try {
      await this.handleRecovery(event.deviceId);
    } catch (error) {
      this.logger.error(
        `Recovery handling failed for device ${event.deviceId}`,
        error,
      );
    }
  }

  private async handleRecovery(
    deviceId: string,
    now: Date = new Date(),
  ): Promise<void> {
    // Read the open incident WITHOUT closing it yet. The notification is the
    // side effect that can fail, so the incident is only cleared once it has
    // been delivered. Clearing first (then sending) would lose the recovery
    // alert on a transient send failure: the device is back online, so neither
    // the sweep nor a future reconnect would re-raise it.
    const device = await this.devicesRepository.findByDeviceId(deviceId);
    if (!device?.offlineAlertActive) {
      return; // no open incident
    }

    const organizationId = device.organizationId?.toString();
    const screenId = device.screenId?.toString();
    const offlineSince = device.offlineSince ?? device.lastSeenAt;
    if (!organizationId || !screenId || !offlineSince) {
      // Nothing we can describe — just close the incident so it doesn't linger.
      await this.devicesRepository.clearOfflineAlert(deviceId);
      return;
    }

    const settings = await this.loadSettings(organizationId);
    const recipientUserIds = await this.resolveRecipients(
      organizationId,
      settings.recipientRoles,
    );

    if (recipientUserIds.length > 0) {
      const screen = await this.screensRepository.findById(
        organizationId,
        screenId,
      );
      const name = screen?.name ?? '';
      const downtimeMs = Math.max(0, now.getTime() - offlineSince.getTime());

      // Send before clearing: if this throws, the incident stays open and the
      // device's next reconnect retries it instead of dropping it silently.
      await this.notificationsService.createSystemNotification({
        kind: 'device-recovered',
        recipientUserIds,
        translations: this.buildTranslations((lang) => ({
          title: this.i18n.t('notifications.deviceRecovered.title', {
            lang,
            args: { name, downtime: this.formatDuration(downtimeMs) },
          }),
        })),
        meta: { organizationId, screenId, deviceId, offlineSince, downtimeMs },
      });
      this.logger.log(
        `Recovery alert raised for screen "${name}" (device ${deviceId})`,
      );
    }

    // Delivered (or nobody to notify) — now it is safe to close the incident.
    await this.devicesRepository.clearOfflineAlert(deviceId);
  }

  private async loadSettings(
    organizationId: string,
  ): Promise<OrgAlertSettings> {
    const organization =
      await this.organizationsRepository.findById(organizationId);
    return resolveOrgAlertSettings(organization?.alertSettings);
  }

  private async resolveRecipients(
    organizationId: string,
    recipientRoles: AlertRecipientRole[],
  ): Promise<string[]> {
    const allowed = expandRecipientRoles(recipientRoles);
    const memberships =
      await this.organizationsRepository.findMembershipsByOrganizationId(
        organizationId,
      );
    return memberships
      .filter((membership) => allowed.has(membership.role))
      .map((membership) => membership.userId.toString());
  }

  /** Builds `{ en, sr }` translations from a per-language factory. */
  private buildTranslations(
    forLang: (lang: Lang) => { title: string; content?: null },
  ): {
    en: { title: string; content: null };
    sr: { title: string; content: null };
  } {
    return {
      en: { title: forLang('en').title, content: null },
      sr: { title: forLang('sr').title, content: null },
    };
  }

  /** Localized wall-clock instant in the screen's timezone. */
  private formatInstant(
    instant: Date,
    screen: ScreenDocument,
    lang: Lang,
  ): string {
    const timezone = screen.availability?.timezone ?? DEFAULT_TIMEZONE;
    return DateTime.fromJSDate(instant)
      .setZone(timezone)
      .setLocale(lang)
      .toLocaleString(DateTime.DATETIME_SHORT);
  }

  /** Compact "Xh Ym" / "Ym" downtime label (rounded up to at least 1 min). */
  private formatDuration(ms: number): string {
    const totalMinutes = Math.max(1, Math.round(ms / MS_PER_MINUTE));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }
}

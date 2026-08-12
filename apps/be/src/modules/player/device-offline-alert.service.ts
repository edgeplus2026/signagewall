import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { MailService } from '../mail/mail.service';
import { OfflineScreenSummary } from '../mail/templates/screen-offline.template';
import { OrganizationsRepository } from '../organizations/organizations.repository';
import { ScreensRepository } from '../screens/screens.repository';
import { UsersRepository } from '../users/users.repository';
import { DevicesRepository } from './devices.repository';
import { DeviceDocument } from './schemas/device.schema';

/**
 * Emails an organization's members when paired screens stop reporting.
 *
 * Signage runs unattended: nobody stands in front of the display, so a dead
 * screen is typically discovered by a customer or a manager days later. The
 * sweep turns the heartbeat data the platform already collects into the
 * operational alert buyers ask for first.
 *
 * Debounce model: a device is alerted once per offline EPISODE — the
 * `offlineAlertedAt` stamp arms on send and clears when the device reports
 * back online (see {@link DevicesRepository.setPresence}). Screens are grouped
 * so a venue-wide outage produces one email per member, not one per display.
 */
/**
 * How long a device must stay continuously online before its offline episode
 * is considered closed. Comfortably longer than the sweep interval, so one
 * good heartbeat is not mistaken for a recovery.
 */
const REARM_STABLE_MS = 5 * 60_000;

@Injectable()
export class DeviceOfflineAlertService {
  private readonly logger = new Logger(DeviceOfflineAlertService.name);

  constructor(
    private readonly devicesRepository: DevicesRepository,
    private readonly screensRepository: ScreensRepository,
    private readonly organizationsRepository: OrganizationsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async sweep(): Promise<void> {
    const offlineMinutes = this.configService.get<number>(
      'player.offlineAlertMinutes',
      10,
    );
    if (offlineMinutes <= 0 || !this.mailService.isEnabled()) {
      return;
    }

    const lookbackHours = this.configService.get<number>(
      'player.offlineAlertLookbackHours',
      24,
    );
    const maxPerSweep = this.configService.get<number>(
      'player.offlineAlertMaxPerSweep',
      200,
    );

    const now = Date.now();
    const cutoff = new Date(now - offlineMinutes * 60_000);
    const notBefore = new Date(now - lookbackHours * 3_600_000);

    // Re-arm before selecting: a device that has been solidly back for the
    // re-arm window closes its episode here, so a genuine second outage later
    // still alerts, while a screen flapping every few seconds never does.
    await this.devicesRepository.rearmRecoveredDevices(
      new Date(now - REARM_STABLE_MS),
    );
    const devices = await this.devicesRepository.findOfflineForAlert(
      cutoff,
      notBefore,
      maxPerSweep,
    );
    if (devices.length === 0) {
      return;
    }
    if (devices.length === maxPerSweep) {
      this.logger.warn(
        `Offline alert sweep hit the ${maxPerSweep}-device ceiling; older outages roll into the next tick`,
      );
    }

    // Stamp before sending: at-most-once per episode. A crash here costs one
    // email; the reverse order would re-spam every screen on the next tick.
    await this.devicesRepository.markOfflineAlerted(
      devices.map((device) => device.deviceId),
    );

    const byOrganization = new Map<string, DeviceDocument[]>();
    for (const device of devices) {
      const organizationId = device.organizationId?.toString();
      if (!organizationId) {
        continue;
      }
      byOrganization.set(organizationId, [
        ...(byOrganization.get(organizationId) ?? []),
        device,
      ]);
    }

    for (const [organizationId, orgDevices] of byOrganization) {
      try {
        await this.alertOrganization(
          organizationId,
          orgDevices,
          offlineMinutes,
        );
      } catch (error) {
        // Best effort per org: one org's failure must not starve the rest.
        this.logger.error(
          `Offline alert failed for organization ${organizationId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }

  private async alertOrganization(
    organizationId: string,
    devices: DeviceDocument[],
    offlineMinutes: number,
  ): Promise<void> {
    const organization =
      await this.organizationsRepository.findById(organizationId);
    if (!organization) {
      return;
    }

    const screens = await this.screensRepository.findSummariesByIds(
      organizationId,
      devices.flatMap((device) =>
        device.screenId ? [device.screenId.toString()] : [],
      ),
    );
    const screenNames = new Map(
      screens.map((screen) => [screen._id.toString(), screen.name]),
    );

    const summaries: OfflineScreenSummary[] = devices.map((device) => ({
      name:
        screenNames.get(device.screenId?.toString() ?? '') ?? device.deviceId,
      ...(device.lastSeenAt ? { lastSeenAt: device.lastSeenAt } : {}),
    }));

    const recipients = await this.resolveRecipients(organizationId);
    if (recipients.length === 0) {
      this.logger.warn(
        `No mailable members for organization ${organizationId}; offline alert dropped`,
      );
      return;
    }

    const screensUrl = `${this.configService.getOrThrow<string>('frontendUrl')}/screens`;

    // One bad address (or a provider rate-limit rejection) must not cost the
    // remaining members their alert: `markOfflineAlerted` has already stamped
    // every device, so anything skipped here is never retried.
    const results = await Promise.allSettled(
      recipients.map((to) =>
        this.mailService.sendScreenOfflineAlertEmail({
          to,
          organizationName: organization.name,
          screens: summaries,
          offlineMinutes,
          screensUrl,
        }),
      ),
    );

    const failed = results.filter((result) => result.status === 'rejected');
    for (const failure of failed) {
      this.logger.error(
        `Offline alert delivery failed for one member of organization ${organizationId}`,
        failure.reason instanceof Error
          ? failure.reason.stack
          : String(failure.reason),
      );
    }

    this.logger.log(
      `Offline alert sent for ${summaries.length} screen(s) in organization ${organizationId} to ${recipients.length - failed.length}/${recipients.length} member(s)`,
    );
  }

  /** Active, verified members of the organization — each gets the alert. */
  private async resolveRecipients(organizationId: string): Promise<string[]> {
    const memberships =
      await this.organizationsRepository.findMembershipsByOrganizationId(
        organizationId,
      );
    const users = await this.usersRepository.findManyByIds(
      memberships.map((membership) => membership.userId.toString()),
    );

    return users
      .filter((user) => user.isActive && user.isEmailVerified)
      .map((user) => user.email);
  }
}

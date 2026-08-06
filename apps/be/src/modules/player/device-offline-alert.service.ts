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

    const cutoff = new Date(Date.now() - offlineMinutes * 60_000);
    const devices = await this.devicesRepository.findOfflineForAlert(cutoff);
    if (devices.length === 0) {
      return;
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

    for (const to of recipients) {
      await this.mailService.sendScreenOfflineAlertEmail({
        to,
        organizationName: organization.name,
        screens: summaries,
        offlineMinutes,
        screensUrl,
      });
    }

    this.logger.log(
      `Offline alert sent for ${summaries.length} screen(s) in organization ${organizationId} to ${recipients.length} member(s)`,
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

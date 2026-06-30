import { Types } from 'mongoose';

import { OrganizationRole } from '../organizations/schemas/organization-membership.schema';
import type { OrgAlertSettings } from '../organizations/schemas/organization.schema';
import { DeviceAlertsService } from './device-alerts.service';

const NOW = new Date('2026-06-30T12:00:00.000Z');
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000);

const DEFAULT_SETTINGS: OrgAlertSettings = {
  enabled: true,
  offlineThresholdMin: 10,
  recipientRoles: ['admin'],
  respectAvailability: true,
};

interface SystemNotificationCall {
  kind: string;
  recipientUserIds: string[];
  meta?: Record<string, unknown>;
}

interface BuildOptions {
  device?: Record<string, unknown>;
  settings?: Partial<OrgAlertSettings>;
  screen?: Record<string, unknown> | null;
  isOnAt?: boolean;
  memberships?: { userId: Types.ObjectId; role: OrganizationRole }[];
  claimSucceeds?: boolean;
}

function build(options: BuildOptions = {}) {
  const orgId = new Types.ObjectId();
  const screenId = new Types.ObjectId();
  const adminUserId = new Types.ObjectId();
  const memberUserId = new Types.ObjectId();

  const device = {
    deviceId: 'device-1',
    organizationId: orgId,
    screenId,
    lastSeenAt: minutesAgo(30),
    ...options.device,
  };

  const memberships = options.memberships ?? [
    { userId: adminUserId, role: OrganizationRole.ADMIN },
    { userId: memberUserId, role: OrganizationRole.MEMBER },
  ];

  const devicesRepository = {
    findOfflineNotAlerted: jest.fn().mockResolvedValue([device]),
    findByDeviceId: jest.fn().mockResolvedValue(null),
    claimOfflineAlert: jest
      .fn()
      .mockResolvedValue(options.claimSucceeds === false ? null : device),
    clearOfflineAlert: jest.fn().mockResolvedValue(null),
  };
  const screensRepository = {
    findById: jest.fn().mockResolvedValue(
      options.screen === undefined
        ? {
            name: 'Lobby',
            availability: undefined,
            alertMuted: false,
          }
        : options.screen,
    ),
  };
  const organizationsRepository = {
    findById: jest.fn().mockResolvedValue({
      alertSettings: { ...DEFAULT_SETTINGS, ...options.settings },
    }),
    findMembershipsByOrganizationId: jest.fn().mockResolvedValue(memberships),
  };
  const notificationsService = {
    createSystemNotification: jest.fn().mockResolvedValue('notif-1'),
  };
  const availabilityEvaluator = {
    isOnAt: jest.fn().mockReturnValue(options.isOnAt ?? true),
  };
  const i18n = { t: jest.fn().mockReturnValue('rendered-title') };

  const service = new DeviceAlertsService(
    devicesRepository as never,
    screensRepository as never,
    organizationsRepository as never,
    notificationsService as never,
    availabilityEvaluator as never,
    i18n as never,
  );

  return {
    service,
    devicesRepository,
    screensRepository,
    organizationsRepository,
    notificationsService,
    availabilityEvaluator,
    orgId,
    screenId,
    adminUserId,
    memberUserId,
  };
}

describe('DeviceAlertsService', () => {
  describe('sweep', () => {
    it('alerts once when offline past the threshold, to admins/owners only', async () => {
      const ctx = build();

      await ctx.service.sweep(NOW);

      expect(ctx.devicesRepository.claimOfflineAlert).toHaveBeenCalledTimes(1);
      expect(
        ctx.notificationsService.createSystemNotification,
      ).toHaveBeenCalledTimes(1);

      const payload = (
        ctx.notificationsService.createSystemNotification.mock
          .calls as SystemNotificationCall[][]
      )[0][0];
      expect(payload.kind).toBe('device-offline');
      // Admin membership is included; member is excluded by default role config.
      expect(payload.recipientUserIds).toEqual([ctx.adminUserId.toString()]);
      expect(payload.meta).toMatchObject({
        organizationId: ctx.orgId.toString(),
        screenId: ctx.screenId.toString(),
        deviceId: 'device-1',
      });
    });

    it('does not alert before the threshold elapses', async () => {
      const ctx = build({ device: { lastSeenAt: minutesAgo(5) } });

      await ctx.service.sweep(NOW);

      expect(ctx.devicesRepository.claimOfflineAlert).not.toHaveBeenCalled();
      expect(
        ctx.notificationsService.createSystemNotification,
      ).not.toHaveBeenCalled();
    });

    it('does not alert when alerting is disabled for the org', async () => {
      const ctx = build({ settings: { enabled: false } });

      await ctx.service.sweep(NOW);

      expect(
        ctx.notificationsService.createSystemNotification,
      ).not.toHaveBeenCalled();
    });

    it('does not alert a muted screen', async () => {
      const ctx = build({
        screen: { name: 'Lobby', availability: undefined, alertMuted: true },
      });

      await ctx.service.sweep(NOW);

      expect(ctx.devicesRepository.claimOfflineAlert).not.toHaveBeenCalled();
      expect(
        ctx.notificationsService.createSystemNotification,
      ).not.toHaveBeenCalled();
    });

    it('suppresses the alert while the screen is in a scheduled off-window', async () => {
      const ctx = build({ isOnAt: false });

      await ctx.service.sweep(NOW);

      expect(ctx.availabilityEvaluator.isOnAt).toHaveBeenCalled();
      expect(
        ctx.notificationsService.createSystemNotification,
      ).not.toHaveBeenCalled();
    });

    it('still alerts in an off-window when respectAvailability is disabled', async () => {
      const ctx = build({
        isOnAt: false,
        settings: { respectAvailability: false },
      });

      await ctx.service.sweep(NOW);

      expect(
        ctx.notificationsService.createSystemNotification,
      ).toHaveBeenCalledTimes(1);
    });

    it('does not alert (or claim) when there are no eligible recipients', async () => {
      const ctx = build({
        memberships: [
          { userId: new Types.ObjectId(), role: OrganizationRole.MEMBER },
        ],
      });

      await ctx.service.sweep(NOW);

      expect(ctx.devicesRepository.claimOfflineAlert).not.toHaveBeenCalled();
      expect(
        ctx.notificationsService.createSystemNotification,
      ).not.toHaveBeenCalled();
    });

    it('does not double-alert when the incident is already claimed', async () => {
      const ctx = build({ claimSucceeds: false });

      await ctx.service.sweep(NOW);

      expect(ctx.devicesRepository.claimOfflineAlert).toHaveBeenCalledTimes(1);
      expect(
        ctx.notificationsService.createSystemNotification,
      ).not.toHaveBeenCalled();
    });

    it('rolls back the claim if sending the notification fails', async () => {
      const ctx = build();
      ctx.notificationsService.createSystemNotification.mockRejectedValueOnce(
        new Error('send failed'),
      );

      await ctx.service.sweep(NOW);

      // Sweep swallows per-device errors but must reopen the incident.
      expect(ctx.devicesRepository.clearOfflineAlert).toHaveBeenCalledWith(
        'device-1',
      );
    });

    it('includes members when recipientRoles contains member', async () => {
      const ctx = build({ settings: { recipientRoles: ['admin', 'member'] } });

      await ctx.service.sweep(NOW);

      const payload = (
        ctx.notificationsService.createSystemNotification.mock
          .calls as SystemNotificationCall[][]
      )[0][0];
      expect(payload.recipientUserIds).toEqual([
        ctx.adminUserId.toString(),
        ctx.memberUserId.toString(),
      ]);
    });
  });

  describe('recovery', () => {
    const openIncidentDevice = (ctx: ReturnType<typeof build>) => ({
      deviceId: 'device-1',
      offlineAlertActive: true,
      organizationId: ctx.orgId,
      screenId: ctx.screenId,
      offlineSince: minutesAgo(40),
      lastSeenAt: minutesAgo(40),
    });

    it('posts a recovered notification and clears state when a device returns', async () => {
      const ctx = build();
      ctx.devicesRepository.findByDeviceId.mockResolvedValueOnce(
        openIncidentDevice(ctx),
      );

      await ctx.service.onPresenceChanged({
        organizationId: ctx.orgId.toString(),
        screenId: ctx.screenId.toString(),
        deviceId: 'device-1',
        online: true,
        reconnected: true,
        lastSeenAt: NOW.toISOString(),
      });

      const payload = (
        ctx.notificationsService.createSystemNotification.mock
          .calls as SystemNotificationCall[][]
      )[0][0];
      expect(payload.kind).toBe('device-recovered');
      expect(payload.recipientUserIds).toEqual([ctx.adminUserId.toString()]);
      // Incident is cleared only after the notification was sent.
      expect(ctx.devicesRepository.clearOfflineAlert).toHaveBeenCalledWith(
        'device-1',
      );
    });

    it('keeps the incident open (does not clear) when sending the recovery fails', async () => {
      const ctx = build();
      ctx.devicesRepository.findByDeviceId.mockResolvedValueOnce(
        openIncidentDevice(ctx),
      );
      ctx.notificationsService.createSystemNotification.mockRejectedValueOnce(
        new Error('send failed'),
      );

      await ctx.service.onPresenceChanged({
        organizationId: ctx.orgId.toString(),
        screenId: ctx.screenId.toString(),
        deviceId: 'device-1',
        online: true,
        reconnected: true,
        lastSeenAt: NOW.toISOString(),
      });

      // Send failed → incident must stay open so the next reconnect retries it.
      expect(ctx.devicesRepository.clearOfflineAlert).not.toHaveBeenCalled();
    });

    it('does nothing when there is no open incident', async () => {
      const ctx = build();
      // findByDeviceId defaults to resolving null (no open incident).

      await ctx.service.onPresenceChanged({
        organizationId: ctx.orgId.toString(),
        screenId: ctx.screenId.toString(),
        deviceId: 'device-1',
        online: true,
        reconnected: true,
        lastSeenAt: NOW.toISOString(),
      });

      expect(
        ctx.notificationsService.createSystemNotification,
      ).not.toHaveBeenCalled();
      expect(ctx.devicesRepository.clearOfflineAlert).not.toHaveBeenCalled();
    });

    it('ignores heartbeat online events (no reconnect flag) without querying', async () => {
      const ctx = build();

      await ctx.service.onPresenceChanged({
        organizationId: ctx.orgId.toString(),
        screenId: ctx.screenId.toString(),
        deviceId: 'device-1',
        online: true,
        lastSeenAt: NOW.toISOString(),
      });

      // The per-heartbeat firehose must not hit the DB or alert.
      expect(ctx.devicesRepository.findByDeviceId).not.toHaveBeenCalled();
      expect(ctx.devicesRepository.clearOfflineAlert).not.toHaveBeenCalled();
      expect(
        ctx.notificationsService.createSystemNotification,
      ).not.toHaveBeenCalled();
    });

    it('ignores presence events that are not a recovery (online=false)', async () => {
      const ctx = build();

      await ctx.service.onPresenceChanged({
        organizationId: ctx.orgId.toString(),
        screenId: ctx.screenId.toString(),
        deviceId: 'device-1',
        online: false,
        lastSeenAt: NOW.toISOString(),
      });

      expect(ctx.devicesRepository.findByDeviceId).not.toHaveBeenCalled();
      expect(ctx.devicesRepository.clearOfflineAlert).not.toHaveBeenCalled();
      expect(
        ctx.notificationsService.createSystemNotification,
      ).not.toHaveBeenCalled();
    });
  });
});

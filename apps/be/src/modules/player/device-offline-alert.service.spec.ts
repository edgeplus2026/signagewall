import { Types } from 'mongoose';

import { DeviceOfflineAlertService } from './device-offline-alert.service';
import { DeviceStatus } from './schemas/device.schema';

const ORG_A = new Types.ObjectId();
const ORG_B = new Types.ObjectId();

interface DeviceStub {
  deviceId: string;
  status: DeviceStatus;
  screenId: Types.ObjectId;
  organizationId: Types.ObjectId;
  lastSeenAt?: Date;
}

const device = (
  deviceId: string,
  organizationId: Types.ObjectId,
  screenId = new Types.ObjectId(),
): DeviceStub => ({
  deviceId,
  status: DeviceStatus.PAIRED,
  screenId,
  organizationId,
  lastSeenAt: new Date('2026-08-06T10:00:00Z'),
});

interface Deps {
  offlineDevices?: DeviceStub[];
  offlineAlertMinutes?: number;
  mailEnabled?: boolean;
  members?: { userId: Types.ObjectId }[];
  users?: {
    _id: Types.ObjectId;
    email: string;
    isActive: boolean;
    isEmailVerified: boolean;
  }[];
}

function build(deps: Deps = {}) {
  const devicesRepository = {
    findOfflineForAlert: jest.fn().mockResolvedValue(deps.offlineDevices ?? []),
    markOfflineAlerted: jest.fn().mockResolvedValue(undefined),
    rearmRecoveredDevices: jest.fn().mockResolvedValue(0),
  };
  const screensRepository = {
    findSummariesByIds: jest.fn((organizationId: string, ids: string[]) =>
      Promise.resolve(
        ids.map((id) => ({
          _id: new Types.ObjectId(id),
          name: `Screen ${id.slice(-4)}`,
        })),
      ),
    ),
  };
  const organizationsRepository = {
    findById: jest.fn((id: string) =>
      Promise.resolve({ _id: new Types.ObjectId(id), name: 'Test Org' }),
    ),
    findMembershipsByOrganizationId: jest
      .fn()
      .mockResolvedValue(deps.members ?? [{ userId: new Types.ObjectId() }]),
  };
  const defaultUser = {
    _id: new Types.ObjectId(),
    email: 'owner@example.com',
    isActive: true,
    isEmailVerified: true,
  };
  const usersRepository = {
    findManyByIds: jest.fn().mockResolvedValue(deps.users ?? [defaultUser]),
  };
  const mailService = {
    isEnabled: jest.fn(() => deps.mailEnabled ?? true),
    sendScreenOfflineAlertEmail: jest.fn().mockResolvedValue(undefined),
  };
  const configService = {
    get: jest.fn((key: string, fallback?: unknown) =>
      key === 'player.offlineAlertMinutes'
        ? (deps.offlineAlertMinutes ?? 10)
        : fallback,
    ),
    getOrThrow: jest.fn((key: string) => {
      if (key === 'frontendUrl') return 'https://cms.example.com';
      throw new Error(`unexpected config key ${key}`);
    }),
  };

  const service = new DeviceOfflineAlertService(
    devicesRepository as never,
    screensRepository as never,
    organizationsRepository as never,
    usersRepository as never,
    mailService as never,
    configService as never,
  );

  return {
    service,
    devicesRepository,
    screensRepository,
    organizationsRepository,
    usersRepository,
    mailService,
  };
}

describe('DeviceOfflineAlertService.sweep', () => {
  it('does nothing when the alert is disabled (0 minutes)', async () => {
    const { service, devicesRepository } = build({
      offlineAlertMinutes: 0,
      offlineDevices: [device('d1', ORG_A)],
    });

    await service.sweep();

    expect(devicesRepository.findOfflineForAlert).not.toHaveBeenCalled();
  });

  it('does nothing when mail is disabled', async () => {
    const { service, devicesRepository } = build({
      mailEnabled: false,
      offlineDevices: [device('d1', ORG_A)],
    });

    await service.sweep();

    expect(devicesRepository.findOfflineForAlert).not.toHaveBeenCalled();
  });

  it('stamps the alert before any email goes out (at-most-once)', async () => {
    const order: string[] = [];
    const { service, devicesRepository, mailService } = build({
      offlineDevices: [device('d1', ORG_A)],
    });
    devicesRepository.markOfflineAlerted.mockImplementation(() => {
      order.push('mark');
      return Promise.resolve();
    });
    mailService.sendScreenOfflineAlertEmail.mockImplementation(() => {
      order.push('send');
      return Promise.resolve();
    });

    await service.sweep();

    expect(devicesRepository.markOfflineAlerted).toHaveBeenCalledWith(['d1']);
    expect(order[0]).toBe('mark');
  });

  it('groups screens into one email per member per organization', async () => {
    const { service, mailService } = build({
      offlineDevices: [device('d1', ORG_A), device('d2', ORG_A)],
    });

    await service.sweep();

    expect(mailService.sendScreenOfflineAlertEmail).toHaveBeenCalledTimes(1);
    const call = mailService.sendScreenOfflineAlertEmail.mock.calls[0][0] as {
      to: string;
      screens: unknown[];
      screensUrl: string;
    };
    expect(call.to).toBe('owner@example.com');
    expect(call.screens).toHaveLength(2);
    expect(call.screensUrl).toBe('https://cms.example.com/screens');
  });

  it('alerts each organization independently and survives one failing', async () => {
    const { service, mailService, organizationsRepository } = build({
      offlineDevices: [device('d1', ORG_A), device('d2', ORG_B)],
    });
    organizationsRepository.findById.mockImplementationOnce(() =>
      Promise.reject(new Error('db down')),
    );

    await service.sweep();

    // First org lookup failed; the second org still got its email.
    expect(mailService.sendScreenOfflineAlertEmail).toHaveBeenCalledTimes(1);
  });

  it('skips members that are inactive or unverified', async () => {
    const { service, mailService } = build({
      offlineDevices: [device('d1', ORG_A)],
      users: [
        {
          _id: new Types.ObjectId(),
          email: 'ok@example.com',
          isActive: true,
          isEmailVerified: true,
        },
        {
          _id: new Types.ObjectId(),
          email: 'inactive@example.com',
          isActive: false,
          isEmailVerified: true,
        },
        {
          _id: new Types.ObjectId(),
          email: 'unverified@example.com',
          isActive: true,
          isEmailVerified: false,
        },
      ],
    });

    await service.sweep();

    expect(mailService.sendScreenOfflineAlertEmail).toHaveBeenCalledTimes(1);
    expect(
      (
        mailService.sendScreenOfflineAlertEmail.mock.calls[0][0] as {
          to: string;
        }
      ).to,
    ).toBe('ok@example.com');
  });

  /**
   * `offlineAlertedAt` is a new field, so on the first sweep after deploy every
   * historically-dark screen has no stamp. Only the bounded window stops that
   * from becoming one email listing screens retired months ago.
   */
  it('bounds the query to a recent window and a per-sweep ceiling', async () => {
    const { service, devicesRepository } = build({
      offlineDevices: [device('d-1', ORG_A)],
    });

    await service.sweep();

    expect(devicesRepository.findOfflineForAlert).toHaveBeenCalledTimes(1);
    const [cutoff, notBefore, limit] = devicesRepository.findOfflineForAlert
      .mock.calls[0] as [Date, Date, number];

    expect(notBefore.getTime()).toBeLessThan(cutoff.getTime());
    // Default lookback is 24h, cutoff is 10 minutes back.
    expect(cutoff.getTime() - notBefore.getTime()).toBe(
      24 * 3_600_000 - 10 * 60_000,
    );
    expect(limit).toBe(200);
  });

  it('still alerts the remaining members when one delivery throws', async () => {
    const { service, mailService } = build({
      offlineDevices: [device('d-1', ORG_A)],
      members: [
        { userId: new Types.ObjectId() },
        { userId: new Types.ObjectId() },
        { userId: new Types.ObjectId() },
      ],
      users: [
        {
          _id: new Types.ObjectId(),
          email: 'first@example.com',
          isActive: true,
          isEmailVerified: true,
        },
        {
          _id: new Types.ObjectId(),
          email: 'bounces@example.com',
          isActive: true,
          isEmailVerified: true,
        },
        {
          _id: new Types.ObjectId(),
          email: 'third@example.com',
          isActive: true,
          isEmailVerified: true,
        },
      ],
    });
    mailService.sendScreenOfflineAlertEmail.mockImplementation(
      ({ to }: { to: string }) =>
        to === 'bounces@example.com'
          ? Promise.reject(new Error('rate limited'))
          : Promise.resolve(undefined),
    );

    await expect(service.sweep()).resolves.toBeUndefined();

    const recipients = mailService.sendScreenOfflineAlertEmail.mock.calls.map(
      (call) => (call[0] as { to: string }).to,
    );
    expect(recipients).toEqual([
      'first@example.com',
      'bounces@example.com',
      'third@example.com',
    ]);
  });
});

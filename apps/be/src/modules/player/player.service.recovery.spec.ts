import { Types } from 'mongoose';

import { BusinessException } from '../../common/exceptions/business.exception';
import { PlayerService } from './player.service';
import { DeviceStatus } from './schemas/device.schema';

/**
 * Admission rules for a paired device reconnecting over the socket. The core
 * security property under test: a bare known `deviceId` is identity, not a
 * credential — admission requires the device token or a single-use recovery
 * code, and everything else is refused with `recovery-required`.
 */

const ORG_ID = new Types.ObjectId();
const SCREEN_ID = new Types.ObjectId();
const DEVICE_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

const SNAPSHOT = { screenId: SCREEN_ID.toString(), revision: 'r1', items: [] };

interface DeviceStub {
  deviceId: string;
  status: DeviceStatus;
  screenId?: Types.ObjectId;
  organizationId?: Types.ObjectId;
  tokenHash?: string;
  volume?: number;
  settings?: undefined;
}

const pairedDevice = (overrides: Partial<DeviceStub> = {}): DeviceStub => ({
  deviceId: DEVICE_ID,
  status: DeviceStatus.PAIRED,
  screenId: SCREEN_ID,
  organizationId: ORG_ID,
  tokenHash: 'hash:stored-token',
  ...overrides,
});

function build(device: DeviceStub | null) {
  const devicesRepository = {
    findByDeviceId: jest.fn().mockResolvedValue(device),
    findByScreenId: jest.fn().mockResolvedValue(device),
    setTokenHash: jest.fn().mockResolvedValue(device),
    setPresence: jest.fn().mockResolvedValue(device),
    setRecoveryCode: jest.fn().mockResolvedValue(device),
    claimRecoveryCode: jest.fn().mockResolvedValue(null),
    unpair: jest.fn().mockResolvedValue(device),
    upsert: jest.fn().mockResolvedValue({
      deviceId: DEVICE_ID,
      pairingCode: 'ABC-D29',
      pairingCodeExpiresAt: new Date(Date.now() + 60_000),
    }),
  };

  const tokensService = {
    // Deterministic "hash": prefix, so stored-vs-provided comparisons read
    // naturally in the assertions below.
    hashToken: jest.fn((token: string) => `hash:${token}`),
    generateToken: jest.fn(() => ({
      token: 'fresh-token',
      tokenHash: 'hash:fresh-token',
    })),
  };

  const screensRepository = {
    findById: jest.fn().mockResolvedValue({ _id: SCREEN_ID }),
  };

  const service = new PlayerService(
    devicesRepository as never,
    screensRepository as never,
    { resolveByScreenId: jest.fn().mockResolvedValue(SNAPSHOT) } as never,
    tokensService as never,
    { emit: jest.fn() } as never,
    { t: (key: string) => key } as never,
    {} as never, // organizationsRepository
    { record: jest.fn().mockResolvedValue(undefined) } as never,
  );

  return { service, devicesRepository, tokensService, screensRepository };
}

describe('PlayerService.handleConnect — paired admission', () => {
  it('admits proof of possession (matching token) without rotating it', async () => {
    const { service, devicesRepository } = build(pairedDevice());

    const result = await service.handleConnect(
      DEVICE_ID,
      'stored-token',
      undefined,
    );

    expect(result.kind).toBe('paired');
    expect(devicesRepository.setTokenHash).not.toHaveBeenCalled();
  });

  it('refuses a bare known deviceId (no token, no recovery code)', async () => {
    const { service, devicesRepository } = build(pairedDevice());

    const result = await service.handleConnect(DEVICE_ID, undefined, undefined);

    expect(result).toEqual({ kind: 'recovery-required' });
    // A refused connection must leave no trace: no token rotation (which would
    // kick the legitimate device off) and no presence flip.
    expect(devicesRepository.setTokenHash).not.toHaveBeenCalled();
    expect(devicesRepository.setPresence).not.toHaveBeenCalled();
  });

  it('refuses a wrong token the same way', async () => {
    const { service } = build(pairedDevice());

    const result = await service.handleConnect(
      DEVICE_ID,
      'not-the-token',
      undefined,
    );

    expect(result).toEqual({ kind: 'recovery-required' });
  });

  it('redeems a valid recovery code for a fresh token', async () => {
    const device = pairedDevice();
    const { service, devicesRepository } = build(device);
    devicesRepository.claimRecoveryCode.mockResolvedValue(device);

    const result = await service.handleConnect(
      DEVICE_ID,
      undefined,
      undefined,
      'recovery-code',
    );

    expect(devicesRepository.claimRecoveryCode).toHaveBeenCalledWith(
      DEVICE_ID,
      'hash:recovery-code',
    );
    expect(devicesRepository.setTokenHash).toHaveBeenCalledWith(
      DEVICE_ID,
      'hash:fresh-token',
    );
    expect(result).toMatchObject({ kind: 'paired', token: 'fresh-token' });
  });

  it('refuses a spent or expired recovery code', async () => {
    const { service, devicesRepository } = build(pairedDevice());
    devicesRepository.claimRecoveryCode.mockResolvedValue(null);

    const result = await service.handleConnect(
      DEVICE_ID,
      undefined,
      undefined,
      'stale-code',
    );

    expect(result).toEqual({ kind: 'recovery-required' });
    expect(devicesRepository.setTokenHash).not.toHaveBeenCalled();
  });

  it('issues a first token to a legacy paired record that never had one', async () => {
    const { service, devicesRepository } = build(
      pairedDevice({ tokenHash: undefined }),
    );

    const result = await service.handleConnect(DEVICE_ID, undefined, undefined);

    expect(devicesRepository.setTokenHash).toHaveBeenCalledWith(
      DEVICE_ID,
      'hash:fresh-token',
    );
    expect(result).toMatchObject({ kind: 'paired', token: 'fresh-token' });
  });

  it('leaves the unpaired flow untouched', async () => {
    const { service } = build(null);

    const result = await service.handleConnect(DEVICE_ID, undefined, undefined);

    expect(result).toMatchObject({ kind: 'unpaired', code: 'ABC-D29' });
  });
});

describe('PlayerService.createRecoveryLink', () => {
  it('arms a hashed single-use code and returns the raw one exactly once', async () => {
    const { service, devicesRepository } = build(pairedDevice());

    const link = await service.createRecoveryLink(
      ORG_ID.toString(),
      SCREEN_ID.toString(),
    );

    expect(link.deviceId).toBe(DEVICE_ID);
    expect(link.recoveryCode).toBe('fresh-token');
    expect(devicesRepository.setRecoveryCode).toHaveBeenCalledWith(
      DEVICE_ID,
      'hash:fresh-token',
      expect.any(Date),
    );
  });

  it('404s when the screen is not in the organization', async () => {
    const { service, screensRepository } = build(pairedDevice());
    screensRepository.findById.mockResolvedValue(null);

    await expect(
      service.createRecoveryLink(ORG_ID.toString(), SCREEN_ID.toString()),
    ).rejects.toBeInstanceOf(BusinessException);
  });

  it('404s when the paired device belongs to another organization', async () => {
    const foreign = pairedDevice({ organizationId: new Types.ObjectId() });
    const { service } = build(foreign);

    await expect(
      service.createRecoveryLink(ORG_ID.toString(), SCREEN_ID.toString()),
    ).rejects.toBeInstanceOf(BusinessException);
  });
});

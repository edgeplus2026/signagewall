import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { I18nService } from 'nestjs-i18n';

import { BusinessException } from '../../common/exceptions/business.exception';
import { ScreensRepository } from '../screens/screens.repository';
import { DevicesRepository } from './devices.repository';
import { PlayerContentService, PlayerSnapshot } from './player-content.service';
import {
  DevicePairedEvent,
  DeviceRevokedEvent,
  PlayerEvents,
} from './player.events';
import { PlayerTokensService } from './player-tokens.service';
import {
  DeviceDocument,
  DeviceProfile,
  DeviceStatus,
} from './schemas/device.schema';

/** Profile fields the player reports on connect/heartbeat. */
export interface ReportedProfile {
  platform?: string;
  userAgent?: string;
  appVersion?: string;
  screenWidth?: number;
  screenHeight?: number;
}

export type ConnectResult =
  | {
      kind: 'unpaired';
      code: string;
      expiresAt: Date;
      tokenWasInvalid: boolean;
    }
  | {
      kind: 'paired';
      screenId: string;
      organizationId: string;
      snapshot: PlayerSnapshot;
      /** Present only when a token was (re)issued and must be persisted client-side. */
      token?: string;
    };

export interface DeviceStatusDto {
  paired: boolean;
  online: boolean;
  deviceId?: string;
  lastSeenAt?: string;
  profile?: ReportedProfile;
}

const MAX_CODE_ATTEMPTS = 5;
const DUPLICATE_KEY_ERROR = 11000;

@Injectable()
export class PlayerService {
  private readonly logger = new Logger(PlayerService.name);

  constructor(
    private readonly devicesRepository: DevicesRepository,
    private readonly screensRepository: ScreensRepository,
    private readonly contentService: PlayerContentService,
    private readonly tokensService: PlayerTokensService,
    private readonly eventEmitter: EventEmitter2,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Resolves what to send a freshly connected device: either a pairing code
   * (unpaired) or its content snapshot (paired). A known paired device that
   * reconnects without a valid token gets one re-issued — `deviceId` is the
   * stable identity in this 1:1 model, so we avoid stranding the screen.
   */
  async handleConnect(
    deviceId: string,
    token: string | undefined,
    profile: ReportedProfile | undefined,
  ): Promise<ConnectResult> {
    const deviceProfile = this.toDeviceProfile(profile);
    const device = await this.devicesRepository.findByDeviceId(deviceId);

    if (device?.status === DeviceStatus.PAIRED && device.screenId) {
      return this.resolvePairedConnect(device, token, deviceProfile);
    }

    return this.issueUnpaired(deviceId, deviceProfile, Boolean(token));
  }

  private async resolvePairedConnect(
    device: DeviceDocument,
    token: string | undefined,
    profile: DeviceProfile | undefined,
  ): Promise<ConnectResult> {
    const organizationId = device.organizationId?.toString();
    const screenId = device.screenId?.toString();

    if (!organizationId || !screenId) {
      return this.issueUnpaired(device.deviceId, profile, Boolean(token));
    }

    const snapshot = await this.contentService.resolveByScreenId(
      organizationId,
      screenId,
    );

    if (!snapshot) {
      // The bound screen no longer exists — revoke and fall back to pairing.
      await this.devicesRepository.unpair(device.deviceId);
      this.emitRevoked(device.deviceId);
      return this.issueUnpaired(device.deviceId, profile, Boolean(token));
    }

    let issuedToken: string | undefined;
    const providedHash = token
      ? this.tokensService.hashToken(token)
      : undefined;

    if (!device.tokenHash || providedHash !== device.tokenHash) {
      const generated = this.tokensService.generateToken();
      await this.devicesRepository.setTokenHash(
        device.deviceId,
        generated.tokenHash,
      );
      issuedToken = generated.token;
    }

    await this.devicesRepository.setPresence(device.deviceId, true, profile);

    return {
      kind: 'paired',
      screenId,
      organizationId,
      snapshot,
      ...(issuedToken ? { token: issuedToken } : {}),
    };
  }

  private async issueUnpaired(
    deviceId: string,
    profile: DeviceProfile | undefined,
    tokenWasInvalid: boolean,
  ): Promise<ConnectResult> {
    const device = await this.devicesRepository.upsert(deviceId, profile);
    const { code, expiresAt } = await this.ensurePairingCode(device);
    await this.devicesRepository.setPresence(deviceId, true, profile);

    return { kind: 'unpaired', code, expiresAt, tokenWasInvalid };
  }

  /**
   * Returns the device's existing pairing code when it is still valid, so a
   * device that merely reconnects (refresh, reboot) keeps showing the same code
   * — the code is bound to the stable `deviceId`, not to a socket. Only mints a
   * new code when there is none or it has expired.
   */
  private async ensurePairingCode(
    device: DeviceDocument,
  ): Promise<{ code: string; expiresAt: Date }> {
    if (
      device.pairingCode &&
      device.pairingCodeExpiresAt &&
      device.pairingCodeExpiresAt > new Date()
    ) {
      return {
        code: device.pairingCode,
        expiresAt: device.pairingCodeExpiresAt,
      };
    }

    return this.assignPairingCode(device.deviceId);
  }

  /** Assigns a fresh, unique pairing code, retrying on the unique-index clash. */
  private async assignPairingCode(
    deviceId: string,
  ): Promise<{ code: string; expiresAt: Date }> {
    const expiresAt = this.tokensService.pairingCodeExpiry();

    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
      const code = this.tokensService.generatePairingCode();
      try {
        await this.devicesRepository.setPairingCode(deviceId, code, expiresAt);
        return { code, expiresAt };
      } catch (error) {
        if (this.isDuplicateKeyError(error)) {
          continue;
        }
        throw error;
      }
    }

    throw BusinessException.conflict(
      this.i18n.t('player.pairingCodeUnavailable'),
    );
  }

  /** CMS action: bind the device holding `code` to the given screen. */
  async pairScreenDevice(
    organizationId: string,
    screenId: string,
    code: string,
  ): Promise<DeviceStatusDto> {
    const screen = await this.screensRepository.findById(
      organizationId,
      screenId,
    );

    if (!screen) {
      throw BusinessException.notFound(this.i18n.t('player.screenNotFound'));
    }

    const device = await this.devicesRepository.findByPairingCode(
      this.normalizePairingCode(code),
    );

    if (!device || device.status !== DeviceStatus.UNPAIRED) {
      throw BusinessException.notFound(
        this.i18n.t('player.invalidPairingCode'),
      );
    }

    if (
      device.pairingCodeExpiresAt &&
      device.pairingCodeExpiresAt < new Date()
    ) {
      throw BusinessException.badRequest(
        this.i18n.t('player.pairingCodeExpired'),
      );
    }

    // Re-pairing a screen to a new device: detach the previous one first so the
    // unique screenId index does not reject the new binding.
    const existing = await this.devicesRepository.findByScreenId(screenId);
    if (existing && existing.deviceId !== device.deviceId) {
      await this.devicesRepository.unpair(existing.deviceId);
      this.emitRevoked(existing.deviceId);
    }

    const generated = this.tokensService.generateToken();
    const paired = await this.devicesRepository.pair(device.deviceId, {
      screenId,
      organizationId,
      tokenHash: generated.tokenHash,
    });

    if (!paired) {
      throw BusinessException.conflict(this.i18n.t('player.pairingFailed'));
    }

    this.eventEmitter.emit(PlayerEvents.DevicePaired, {
      deviceId: paired.deviceId,
      organizationId,
      screenId,
      token: generated.token,
    } satisfies DevicePairedEvent);

    return this.toDeviceStatus(paired);
  }

  async getScreenDevice(
    organizationId: string,
    screenId: string,
  ): Promise<DeviceStatusDto> {
    const screen = await this.screensRepository.findById(
      organizationId,
      screenId,
    );

    if (!screen) {
      throw BusinessException.notFound(this.i18n.t('player.screenNotFound'));
    }

    const device = await this.devicesRepository.findByScreenId(screenId);

    if (!device) {
      return { paired: false, online: false };
    }

    return this.toDeviceStatus(device);
  }

  async unpairScreenDevice(
    organizationId: string,
    screenId: string,
  ): Promise<void> {
    const device = await this.devicesRepository.findByScreenId(screenId);

    if (!device || device.organizationId?.toString() !== organizationId) {
      return;
    }

    await this.devicesRepository.unpair(device.deviceId);
    this.emitRevoked(device.deviceId);
  }

  async recordHeartbeat(
    deviceId: string,
    profile?: ReportedProfile,
  ): Promise<void> {
    await this.devicesRepository.setPresence(
      deviceId,
      true,
      this.toDeviceProfile(profile),
    );
  }

  async markOffline(deviceId: string): Promise<void> {
    await this.devicesRepository.setPresence(deviceId, false);
  }

  /** Authenticates a REST player-token request; returns the bound device. */
  async authenticateToken(token: string): Promise<DeviceDocument | null> {
    const device = await this.devicesRepository.findByTokenHash(
      this.tokensService.hashToken(token),
    );

    if (!device || device.status !== DeviceStatus.PAIRED || !device.screenId) {
      return null;
    }

    return device;
  }

  resolveSnapshot(
    organizationId: string,
    screenId: string,
  ): Promise<PlayerSnapshot | null> {
    return this.contentService.resolveByScreenId(organizationId, screenId);
  }

  private emitRevoked(deviceId: string): void {
    this.eventEmitter.emit(PlayerEvents.DeviceRevoked, {
      deviceId,
    } satisfies DeviceRevokedEvent);
  }

  private toDeviceStatus(device: DeviceDocument): DeviceStatusDto {
    return {
      paired: device.status === DeviceStatus.PAIRED,
      online: device.online,
      deviceId: device.deviceId,
      ...(device.lastSeenAt
        ? { lastSeenAt: device.lastSeenAt.toISOString() }
        : {}),
      ...(device.profile
        ? { profile: this.toReportedProfile(device.profile) }
        : {}),
    };
  }

  private toReportedProfile(profile: DeviceProfile): ReportedProfile {
    return {
      ...(profile.platform ? { platform: profile.platform } : {}),
      ...(profile.userAgent ? { userAgent: profile.userAgent } : {}),
      ...(profile.appVersion ? { appVersion: profile.appVersion } : {}),
      ...(profile.screenWidth !== undefined
        ? { screenWidth: profile.screenWidth }
        : {}),
      ...(profile.screenHeight !== undefined
        ? { screenHeight: profile.screenHeight }
        : {}),
    };
  }

  private toDeviceProfile(
    profile: ReportedProfile | undefined,
  ): DeviceProfile | undefined {
    if (!profile) {
      return undefined;
    }

    return {
      ...(profile.platform ? { platform: profile.platform } : {}),
      ...(profile.userAgent ? { userAgent: profile.userAgent } : {}),
      ...(profile.appVersion ? { appVersion: profile.appVersion } : {}),
      ...(profile.screenWidth !== undefined
        ? { screenWidth: profile.screenWidth }
        : {}),
      ...(profile.screenHeight !== undefined
        ? { screenHeight: profile.screenHeight }
        : {}),
    };
  }

  /** Normalizes user-typed codes (case/spacing) to the stored `ABC-D29` form. */
  private normalizePairingCode(code: string): string {
    const cleaned = code
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6);

    return cleaned.length === 6
      ? `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`
      : cleaned;
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: number }).code === DUPLICATE_KEY_ERROR
    );
  }
}

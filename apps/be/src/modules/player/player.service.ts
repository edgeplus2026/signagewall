import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ReportedProfile } from '@signagewall/player-contract';
import { I18nService } from 'nestjs-i18n';

import { BusinessException } from '../../common/exceptions/business.exception';
import { ScreensRepository } from '../screens/screens.repository';
import { DevicesRepository } from './devices.repository';
import { PlayerContentService, PlayerSnapshot } from './player-content.service';
import {
  DeviceCommandEvent,
  DevicePairedEvent,
  DevicePresenceChangedEvent,
  DeviceRevokedEvent,
  DeviceSettingsPayload,
  PlayerCommand,
  PlayerEvents,
} from './player.events';
import { PlayerTokensService } from './player-tokens.service';
import {
  DEFAULT_DAILY_RELOAD_TIME,
  DeviceDocument,
  DeviceOrientation,
  DeviceProfile,
  DeviceScale,
  DeviceSettings,
  DeviceStatus,
  KioskMode,
} from './schemas/device.schema';

// `ReportedProfile` (what the player reports on connect/heartbeat) is the shared
// contract type from `@signagewall/player-contract` — imported above and re-exported so
// existing importers (e.g. player.gateway) keep resolving it from here.
export type { ReportedProfile };

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
      /** Current playback volume 0–100 to apply on connect. */
      volume: number;
      /** Display + power settings to apply on connect. */
      settings: DeviceSettingsPayload;
      /** Present only when a token was (re)issued and must be persisted client-side. */
      token?: string;
    };

export interface DeviceStatusDto {
  paired: boolean;
  online: boolean;
  deviceId?: string;
  lastSeenAt?: string;
  profile?: ReportedProfile;
  /** Playback volume 0–100. */
  volume?: number;
  /** Display + power settings. */
  settings?: DeviceSettingsPayload;
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

    const updated = await this.devicesRepository.setPresence(
      device.deviceId,
      true,
      profile,
    );
    this.emitPresence(updated, true);

    return {
      kind: 'paired',
      screenId,
      organizationId,
      snapshot,
      volume: device.volume ?? 100,
      settings: this.toSettingsPayload(device.settings),
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
      volume: paired.volume ?? 100,
      settings: this.toSettingsPayload(paired.settings),
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

  /**
   * Presence for every paired device in the org, keyed by screen id. Lets the
   * CMS seed its live presence map in one request before the socket takes over.
   */
  async listScreenDevices(
    organizationId: string,
  ): Promise<Record<string, DeviceStatusDto>> {
    const devices =
      await this.devicesRepository.findPairedByOrganization(organizationId);

    const byScreen: Record<string, DeviceStatusDto> = {};
    for (const device of devices) {
      const screenId = device.screenId?.toString();
      if (screenId) {
        byScreen[screenId] = this.toDeviceStatus(device);
      }
    }

    return byScreen;
  }

  /**
   * CMS action: set the bound device's playback volume (0–100). Persists it so
   * it survives reconnects, and pushes a live command to the player if online.
   */
  async setScreenDeviceVolume(
    organizationId: string,
    screenId: string,
    volume: number,
  ): Promise<DeviceStatusDto> {
    const device = await this.resolveOwnedDevice(organizationId, screenId);

    const clamped = Math.round(Math.min(100, Math.max(0, volume)));
    const updated = await this.devicesRepository.setVolume(
      device.deviceId,
      clamped,
    );

    this.eventEmitter.emit(PlayerEvents.DeviceCommand, {
      deviceId: device.deviceId,
      screenId,
      command: { type: 'volume', value: clamped },
    } satisfies DeviceCommandEvent);

    return this.toDeviceStatus(updated ?? device);
  }

  /** CMS action: set the bound device's screen orientation; pushes live. */
  setScreenDeviceOrientation(
    organizationId: string,
    screenId: string,
    orientation: DeviceOrientation,
  ): Promise<DeviceStatusDto> {
    return this.applyDeviceSetting(
      organizationId,
      screenId,
      { orientation },
      {
        type: 'orientation',
        value: orientation,
      },
    );
  }

  /** CMS action: set how the bound device fits content to its screen. */
  setScreenDeviceScale(
    organizationId: string,
    screenId: string,
    scale: DeviceScale,
  ): Promise<DeviceStatusDto> {
    return this.applyDeviceSetting(
      organizationId,
      screenId,
      { scale },
      {
        type: 'scale',
        value: scale,
      },
    );
  }

  /** CMS action: set the kiosk lockdown level enforced by the native shell. */
  setScreenDeviceKioskMode(
    organizationId: string,
    screenId: string,
    kioskMode: KioskMode,
  ): Promise<DeviceStatusDto> {
    return this.applyDeviceSetting(
      organizationId,
      screenId,
      { kioskMode },
      {
        type: 'kioskMode',
        value: kioskMode,
      },
    );
  }

  /** CMS action: configure the bound device's automatic daily reload. */
  setScreenDeviceDailyReload(
    organizationId: string,
    screenId: string,
    dailyReload: { enabled: boolean; time: string },
  ): Promise<DeviceStatusDto> {
    return this.applyDeviceSetting(
      organizationId,
      screenId,
      { dailyReload },
      {
        type: 'dailyReload',
        value: dailyReload,
      },
    );
  }

  /**
   * Shared flow for the persisted device settings: resolve+own the device,
   * persist the patch, and push a live command. The patch is merged over the
   * device's *current* normalized settings and the full subdocument is written,
   * so a device created before the `settings` field existed never ends up with
   * undefined sibling fields in the DB.
   */
  private async applyDeviceSetting(
    organizationId: string,
    screenId: string,
    patch: Partial<DeviceSettingsPayload>,
    command: PlayerCommand,
  ): Promise<DeviceStatusDto> {
    const device = await this.resolveOwnedDevice(organizationId, screenId);
    const merged: DeviceSettingsPayload = {
      ...this.toSettingsPayload(device.settings),
      ...patch,
    };
    const updated = await this.devicesRepository.setSettings(
      device.deviceId,
      merged,
    );

    this.eventEmitter.emit(PlayerEvents.DeviceCommand, {
      deviceId: device.deviceId,
      screenId,
      command,
    } satisfies DeviceCommandEvent);

    return this.toDeviceStatus(updated ?? device);
  }

  /**
   * CMS action: restart the bound player now. Transient — nothing is persisted;
   * if the device is offline the command is simply dropped (a restart of an
   * offline player is meaningless and it will start fresh on next boot anyway).
   */
  async restartScreenDevice(
    organizationId: string,
    screenId: string,
  ): Promise<void> {
    const device = await this.resolveOwnedDevice(organizationId, screenId);

    this.eventEmitter.emit(PlayerEvents.DeviceCommand, {
      deviceId: device.deviceId,
      screenId,
      command: { type: 'restart' },
    } satisfies DeviceCommandEvent);
  }

  /**
   * CMS action: step the bound player to the next/previous content item. Purely
   * transient (nothing is persisted) — issued from the live preview so an
   * operator can scrub the real display. Fanned out to the screen room too, so
   * the preview iframe advances in lockstep with the physical device.
   */
  async stepScreenDevice(
    organizationId: string,
    screenId: string,
    direction: 'next' | 'prev',
  ): Promise<void> {
    const device = await this.resolveOwnedDevice(organizationId, screenId);

    this.eventEmitter.emit(PlayerEvents.DeviceCommand, {
      deviceId: device.deviceId,
      screenId,
      command: { type: direction },
    } satisfies DeviceCommandEvent);
  }

  /** Resolves the device bound to `screenId`, asserting org ownership. */
  private async resolveOwnedDevice(
    organizationId: string,
    screenId: string,
  ): Promise<DeviceDocument> {
    const device = await this.devicesRepository.findByScreenId(screenId);

    if (!device || device.organizationId?.toString() !== organizationId) {
      throw BusinessException.notFound(this.i18n.t('player.deviceNotFound'));
    }

    return device;
  }

  async unpairScreenDevice(
    organizationId: string,
    screenId: string,
  ): Promise<void> {
    const device = await this.devicesRepository.findByScreenId(screenId);

    if (!device || device.organizationId?.toString() !== organizationId) {
      return;
    }

    // Tell the CMS the device is gone (not merely offline) while the screen
    // binding is still readable; `unpair` clears `screenId`, so the presence
    // event can't be derived afterwards.
    this.emitPresence(device, false, false);

    await this.devicesRepository.unpair(device.deviceId);
    this.emitRevoked(device.deviceId);
  }

  /**
   * Signature of the last presence payload broadcast per device. A heartbeat
   * repeats every 30s with identical data, so re-broadcasting it to every CMS
   * socket watching the org is ~17 redundant events/second at 500 devices — for
   * state (online/paired/versions) that almost never changes. We fan out only on
   * an actual change; `lastSeenAt` alone is not a change worth waking every
   * operator's browser for.
   */
  private readonly lastPresenceSignature = new Map<string, string>();

  async recordHeartbeat(
    deviceId: string,
    profile?: ReportedProfile,
  ): Promise<void> {
    const updated = await this.devicesRepository.setPresence(
      deviceId,
      true,
      this.toDeviceProfile(profile),
    );
    this.emitPresence(updated, true);
  }

  async markOffline(deviceId: string): Promise<void> {
    const updated = await this.devicesRepository.setPresence(deviceId, false);
    // An offline flip is always a real change — never let a stale signature
    // suppress it.
    this.lastPresenceSignature.delete(deviceId);
    this.emitPresence(updated, false);
  }

  /**
   * Relays a paired device's online/offline flip (or unpair) to the realtime
   * CMS channel. Reads the screen binding off `device`, so the caller must pass
   * the still-bound document — on unpair, call this *before* clearing it.
   */
  private emitPresence(
    device: DeviceDocument | null,
    online: boolean,
    paired = true,
  ): void {
    if (!device) {
      return;
    }

    const organizationId = device.organizationId?.toString();
    const screenId = device.screenId?.toString();

    if (!organizationId || !screenId) {
      return;
    }

    const event = {
      organizationId,
      screenId,
      deviceId: device.deviceId,
      online,
      paired,
      lastSeenAt: (device.lastSeenAt ?? new Date()).toISOString(),
      ...(device.profile?.appVersion
        ? { appVersion: device.profile.appVersion }
        : {}),
      ...(device.profile?.shellVersion
        ? { shellVersion: device.profile.shellVersion }
        : {}),
      // Carried so an operator can spot a stuck/rolled-back device from the
      // screens list, not only by opening each device tab one at a time.
      ...(device.profile?.updateStatus?.lastResult
        ? { updateResult: device.profile.updateStatus.lastResult }
        : {}),
    } satisfies DevicePresenceChangedEvent;

    // Everything but `lastSeenAt` is what an operator actually reacts to. Only
    // fan out when that changes — see `lastPresenceSignature`.
    const { lastSeenAt: _lastSeenAt, ...meaningful } = event;
    const signature = JSON.stringify(meaningful);
    if (this.lastPresenceSignature.get(device.deviceId) === signature) {
      return;
    }
    this.lastPresenceSignature.set(device.deviceId, signature);

    this.eventEmitter.emit(PlayerEvents.DevicePresenceChanged, event);
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
      volume: device.volume ?? 100,
      settings: this.toSettingsPayload(device.settings),
      ...(device.lastSeenAt
        ? { lastSeenAt: device.lastSeenAt.toISOString() }
        : {}),
      ...(device.profile
        ? { profile: this.toReportedProfile(device.profile) }
        : {}),
    };
  }

  /** Normalizes the (possibly undefined) stored settings, applying defaults. */
  private toSettingsPayload(
    settings: DeviceSettings | undefined,
  ): DeviceSettingsPayload {
    return {
      orientation: settings?.orientation ?? DeviceOrientation.LANDSCAPE,
      scale: settings?.scale ?? DeviceScale.FIT,
      kioskMode: settings?.kioskMode ?? KioskMode.OFF,
      dailyReload: {
        enabled: settings?.dailyReload?.enabled ?? true,
        time: settings?.dailyReload?.time ?? DEFAULT_DAILY_RELOAD_TIME,
      },
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
      ...(profile.shellVersion ? { shellVersion: profile.shellVersion } : {}),
      ...(profile.runtime ? { runtime: profile.runtime } : {}),
      ...(profile.updateStatus ? { updateStatus: profile.updateStatus } : {}),
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
      ...(profile.shellVersion ? { shellVersion: profile.shellVersion } : {}),
      ...(profile.runtime ? { runtime: profile.runtime } : {}),
      ...(profile.updateStatus ? { updateStatus: profile.updateStatus } : {}),
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

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  DiagnosticsReport,
  isShellCommand,
  ReportedProfile,
  type ShellCommand,
  type ShellStatusReport,
  type ShellStatusResponse,
} from '@signagewall/player-contract';
import { I18nService } from 'nestjs-i18n';

import { BusinessException } from '../../common/exceptions/business.exception';
import { AnalyticsService } from '../analytics/analytics.service';
import { FunnelEventName } from '../analytics/schemas/funnel-event.schema';
import { OrganizationsRepository } from '../organizations/organizations.repository';
import { ScreensRepository } from '../screens/screens.repository';
import { DevicesRepository } from './devices.repository';
import { boundDiagnosticsReport } from './diagnostics-report.util';
import { PlayerContentService, PlayerSnapshot } from './player-content.service';
import {
  DeviceCommandEvent,
  FleetCommandEvent,
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
} from './schemas/device.schema';

// `ReportedProfile` (what the player reports on connect/heartbeat) is the shared
// contract type from `@signagewall/player-contract` — imported above and re-exported so
// existing importers (e.g. player.gateway) keep resolving it from here.
export type {
  DiagnosticsReport,
  ReportedProfile,
  ShellCommand,
  ShellStatusReport,
  ShellStatusResponse,
};

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
      /**
       * A recovery code was redeemed against a device that already held a
       * valid token, so whoever held that token (typically the physical
       * display) has just been displaced. The gateway must revoke the other
       * sockets on this device id — silently invalidating them leaves the TV
       * looking fine until its next reconnect, when it hard-resets.
       */
      displacedPreviousHolder?: boolean;
    }
  | {
      /**
       * A known paired `deviceId` connected without its token and without a
       * valid recovery code. The bare id must not act as a bearer credential,
       * so the connection is refused: the client discards its identity and
       * re-enters the pairing flow with a fresh one.
       */
      kind: 'recovery-required';
    };

export interface RecoveryLinkDto {
  deviceId: string;
  /** Single-use, short-lived; only ever returned here, stored as a hash. */
  recoveryCode: string;
  expiresAt: string;
}

/** A stored report, plus when the backend received it. */
export type StoredDiagnosticsReport = DiagnosticsReport & {
  receivedAt?: string;
};

export interface DeviceStatusDto {
  paired: boolean;
  online: boolean;
  deviceId?: string;
  lastSeenAt?: string;
  profile?: ReportedProfile;
  /** The last on-demand report this device sent, if any. */
  diagnostics?: StoredDiagnosticsReport;
  /** What the native shell last reported on its own channel, and when. */
  shellStatus?: ShellStatusReport;
  shellStatusAt?: string;
  /** Playback volume 0–100. */
  volume?: number;
  /** Display + power settings. */
  settings?: DeviceSettingsPayload;
}

const MAX_CODE_ATTEMPTS = 5;
const DUPLICATE_KEY_ERROR = 11000;

/**
 * Lifetime of a single-use recovery code. Long enough for the operator to
 * click through to the opened tab (or paste the link on the kiosk), short
 * enough that a leaked link goes stale before it travels far.
 */
const RECOVERY_CODE_TTL_MS = 10 * 60_000;

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
    private readonly organizationsRepository: OrganizationsRepository,
    private readonly analytics: AnalyticsService,
  ) {}

  /**
   * Resolves what to send a freshly connected device: a pairing code
   * (unpaired), its content snapshot (paired), or a recovery refusal. A paired
   * device is admitted only on proof of possession — its device token — or a
   * single-use operator-minted recovery code; a bare known `deviceId` is NOT
   * a credential (it travels in URLs, history and access logs).
   */
  async handleConnect(
    deviceId: string,
    token: string | undefined,
    profile: ReportedProfile | undefined,
    recoveryCode?: string,
  ): Promise<ConnectResult> {
    const deviceProfile = this.toDeviceProfile(profile);
    const device = await this.devicesRepository.findByDeviceId(deviceId);

    if (device?.status === DeviceStatus.PAIRED && device.screenId) {
      return this.resolvePairedConnect(
        device,
        token,
        deviceProfile,
        recoveryCode,
      );
    }

    return this.issueUnpaired(deviceId, deviceProfile, Boolean(token));
  }

  private async resolvePairedConnect(
    device: DeviceDocument,
    token: string | undefined,
    profile: DeviceProfile | undefined,
    recoveryCode: string | undefined,
  ): Promise<ConnectResult> {
    const organizationId = device.organizationId?.toString();
    const screenId = device.screenId?.toString();

    if (!organizationId || !screenId) {
      return this.issueUnpaired(device.deviceId, profile, Boolean(token));
    }

    let issuedToken: string | undefined;
    // True when the device already had a token that someone else may still be
    // holding — i.e. this admission displaces a live player.
    let displacedPreviousHolder = false;
    const providedHash = token
      ? this.tokensService.hashToken(token)
      : undefined;
    const tokenValid = Boolean(
      device.tokenHash && providedHash === device.tokenHash,
    );

    if (!tokenValid) {
      displacedPreviousHolder = Boolean(device.tokenHash);
      issuedToken = await this.recoverWithoutToken(device, recoveryCode);
      if (issuedToken === undefined) {
        this.logger.warn(
          `Refused bare-id reconnect for paired device ${device.deviceId} (no token, no valid recovery code)`,
        );
        return { kind: 'recovery-required' };
      }
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
      ...(displacedPreviousHolder ? { displacedPreviousHolder: true } : {}),
    };
  }

  /**
   * Tokenless admission paths for a paired device, in order of legitimacy:
   * a record that never had a token (legacy) gets one issued, and a valid
   * single-use recovery code is redeemed atomically for a fresh token.
   * Everything else returns undefined — refuse.
   */
  private async recoverWithoutToken(
    device: DeviceDocument,
    recoveryCode: string | undefined,
  ): Promise<string | undefined> {
    if (device.tokenHash && !recoveryCode) {
      return undefined;
    }

    if (device.tokenHash && recoveryCode) {
      const claimed = await this.devicesRepository.claimRecoveryCode(
        device.deviceId,
        this.tokensService.hashToken(recoveryCode),
      );
      if (!claimed) {
        return undefined;
      }
    }

    const generated = this.tokensService.generateToken();
    await this.devicesRepository.setTokenHash(
      device.deviceId,
      generated.tokenHash,
    );
    return generated.token;
  }

  /**
   * Operator action behind "Open web player": arms a short-lived single-use
   * recovery code for the screen's paired device. The resulting URL admits
   * exactly one fresh browser as that device; the previous device token is
   * rotated on redemption, and the code itself is stored only as a hash.
   */
  async createRecoveryLink(
    organizationId: string,
    screenId: string,
  ): Promise<RecoveryLinkDto> {
    const screen = await this.screensRepository.findById(
      organizationId,
      screenId,
    );

    if (!screen) {
      throw BusinessException.notFound(this.i18n.t('player.screenNotFound'));
    }

    const device = await this.devicesRepository.findByScreenId(screenId);

    if (!device || device.organizationId?.toString() !== organizationId) {
      throw BusinessException.notFound(this.i18n.t('player.deviceNotFound'));
    }

    const { token: recoveryCode, tokenHash } =
      this.tokensService.generateToken();
    const expiresAt = new Date(Date.now() + RECOVERY_CODE_TTL_MS);
    await this.devicesRepository.setRecoveryCode(
      device.deviceId,
      tokenHash,
      expiresAt,
    );

    return {
      deviceId: device.deviceId,
      recoveryCode,
      expiresAt: expiresAt.toISOString(),
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

    const organization =
      await this.organizationsRepository.findById(organizationId);
    await this.analytics.record({
      eventName: FunnelEventName.DEVICE_PAIRED,
      userId: organization?.ownerUserId?.toString(),
      organizationId,
      dedupeKey: `device_paired:device:${paired.deviceId}`,
    });

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
   * CMS action: make this one screen install a pending shell update now.
   *
   * The everyday use is not the emergency — it is proving a release on your own
   * screen before it goes to anyone else's. A device with nothing pending simply
   * reports back that there was no update; the command is safe to issue blind.
   */
  async applyUpdateOnScreenDevice(
    organizationId: string,
    screenId: string,
  ): Promise<void> {
    const device = await this.resolveOwnedDevice(organizationId, screenId);

    this.eventEmitter.emit(PlayerEvents.DeviceCommand, {
      deviceId: device.deviceId,
      screenId,
      command: { type: 'applyUpdate' },
    } satisfies DeviceCommandEvent);
  }

  /**
   * CMS action: ask this screen to report its state back. The answer arrives
   * asynchronously on the socket, so this returns as soon as the request is out —
   * an offline device simply never answers, and the CMS keeps showing the previous
   * report with its own timestamp rather than pretending it is current.
   */
  async requestDiagnostics(
    organizationId: string,
    screenId: string,
  ): Promise<void> {
    const device = await this.resolveOwnedDevice(organizationId, screenId);

    this.eventEmitter.emit(PlayerEvents.DeviceCommand, {
      deviceId: device.deviceId,
      screenId,
      command: { type: 'sendDiagnostics' },
    } satisfies DeviceCommandEvent);
  }

  /**
   * Super-admin action: tell EVERY connected device to install a pending update.
   *
   * Owns no organization and resolves no device — it hands one command to the
   * gateway, which broadcasts it. Reaches only what is connected at that instant;
   * everything else updates on its own schedule.
   */
  applyUpdateOnAllDevices(): void {
    this.eventEmitter.emit(PlayerEvents.FleetCommand, {
      command: { type: 'applyUpdate' },
    } satisfies FleetCommandEvent);
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

  /**
   * Fingerprint of the profile last WRITTEN for a device, so an unchanged beat
   * can skip the write entirely. Same reasoning as
   * {@link lastPresenceSignature}, one layer lower: that one avoids waking every
   * operator's browser, this one avoids rewriting the document.
   */
  private readonly lastProfileSignature = new Map<string, string>();

  async recordHeartbeat(
    deviceId: string,
    profile?: ReportedProfile,
  ): Promise<void> {
    const deviceProfile = this.toDeviceProfile(profile);
    const signature = deviceProfile ? JSON.stringify(deviceProfile) : '';
    const unchanged =
      this.lastProfileSignature.get(deviceId) === signature && signature !== '';

    if (unchanged) {
      // Nothing about this screen changed except the clock. Stamp liveness and
      // stop: rewriting the whole profile subdocument every thirty seconds, per
      // device, was the heaviest write in the system and recorded nothing.
      await this.devicesRepository.touchPresence(deviceId);
      return;
    }

    const updated = await this.devicesRepository.setPresence(
      deviceId,
      true,
      deviceProfile,
    );
    if (signature) {
      this.lastProfileSignature.set(deviceId, signature);
    }
    this.emitPresence(updated, true);
  }

  /**
   * Stores the report a device just sent. Capped here rather than trusted: the
   * log is written by a player that may be newer than this backend, and a device
   * that starts sending megabytes must cost one truncated document, never a
   * degraded database.
   */
  async recordDiagnostics(
    deviceId: string,
    report: DiagnosticsReport,
  ): Promise<void> {
    await this.devicesRepository.setDiagnosticsReport(deviceId, {
      ...boundDiagnosticsReport(report as Record<string, unknown>),
      // Stamped here, not by the device: a screen with a wrong clock would
      // otherwise make a fresh report look days old, or worse, look current
      // when it is not.
      receivedAt: new Date().toISOString(),
    });
  }

  /**
   * Records what the shell reports on its own channel, and hands back whatever
   * was queued for it.
   *
   * Deliberately does NOT touch presence. Online/offline in this product means
   * "the player page is talking to us", and a shell that is up while the page is
   * dead is precisely the state an operator needs to see — marking such a screen
   * green because its shell answered would hide the only fault this channel
   * exists to reveal.
   */
  async recordShellStatus(
    deviceId: string,
    report: ShellStatusReport,
  ): Promise<ShellStatusResponse> {
    const taken = await this.devicesRepository.recordShellStatusAndTakeCommands(
      deviceId,
      boundDiagnosticsReport(report as Record<string, unknown>),
    );

    return {
      commands: taken.commands.filter(isShellCommand),
      ...(taken.wantsLog ? { wantsLog: true } : {}),
    };
  }

  /**
   * CMS action: queue a command for the shell.
   *
   * The slow path on purpose. Anything the page can do should go over the socket,
   * which is instant; this is what remains when the page is the broken part, and
   * it waits for the shell's next poll.
   */
  async queueShellCommand(
    organizationId: string,
    screenId: string,
    command: ShellCommand,
  ): Promise<void> {
    const device = await this.resolveOwnedDevice(organizationId, screenId);
    await this.devicesRepository.queueShellCommand(device.deviceId, command);
  }

  /** CMS action: ask the shell to bring its event log along next time. */
  async requestShellLog(
    organizationId: string,
    screenId: string,
  ): Promise<void> {
    const device = await this.resolveOwnedDevice(organizationId, screenId);
    await this.devicesRepository.requestShellLog(device.deviceId);
  }

  async markOffline(deviceId: string): Promise<void> {
    const updated = await this.devicesRepository.setPresence(deviceId, false);
    // An offline flip is always a real change — never let a stale signature
    // suppress it. Both caches are dropped together: they are keyed by deviceId
    // and would otherwise grow for every device that ever connected, which on a
    // long-lived process is a slow leak proportional to fleet churn.
    this.lastPresenceSignature.delete(deviceId);
    this.lastProfileSignature.delete(deviceId);
    this.emitPresence(updated, false);
  }

  /**
   * Where a device's reports belong, read back from the device row.
   *
   * The socket normally carries this from the handshake. It does not when the
   * device was paired while ALREADY connected: the pairing event moves the socket
   * into the screen room and hands it a token, but the socket's own data was
   * filled in at connect, when there was no screen yet. Until it reconnects —
   * which may be hours later — anything needing attribution has nowhere to file
   * it, and proof of play would be dropped for exactly the screens somebody just
   * finished setting up.
   *
   * Reading it back on demand costs one indexed lookup, paid only by a socket
   * that is actually missing it, and it works across backend instances — which
   * writing to a remote socket's data would not.
   */
  async resolveAttribution(
    deviceId: string,
  ): Promise<{ screenId: string; organizationId: string } | null> {
    const device = await this.devicesRepository.findByDeviceId(deviceId);
    if (
      !device ||
      device.status !== DeviceStatus.PAIRED ||
      !device.screenId ||
      !device.organizationId
    ) {
      return null;
    }
    return {
      screenId: device.screenId.toString(),
      organizationId: device.organizationId.toString(),
    };
  }

  /**
   * Claims the one-time activation marker for a device, returning true only for
   * the caller that actually set it. See
   * {@link DevicesRepository.claimActivationReport}.
   */
  claimScreenActivation(deviceId: string): Promise<boolean> {
    return this.devicesRepository.claimActivationReport(deviceId);
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

  /** Snapshot of a playlist on its own, for the CMS content preview. */
  resolvePlaylistSnapshot(
    organizationId: string,
    playlistId: string,
  ): Promise<PlayerSnapshot | null> {
    return this.contentService.resolveByPlaylistId(organizationId, playlistId);
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
      ...(device.diagnosticsReport
        ? { diagnostics: device.diagnosticsReport }
        : {}),
      // Deliberately alongside `profile`, never merged into it: the whole value
      // of this one is that it can disagree with what the page says.
      ...(device.shellStatus ? { shellStatus: device.shellStatus } : {}),
      ...(device.shellStatusAt ? { shellStatusAt: device.shellStatusAt } : {}),
    };
  }

  /** Normalizes the (possibly undefined) stored settings, applying defaults. */
  private toSettingsPayload(
    settings: DeviceSettings | undefined,
  ): DeviceSettingsPayload {
    return {
      orientation: settings?.orientation ?? DeviceOrientation.LANDSCAPE,
      scale: settings?.scale ?? DeviceScale.FIT,
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
      ...(profile.diagnostics ? { diagnostics: profile.diagnostics } : {}),
      // Explicit `!== undefined`, never a truthiness test: `false` is the answer
      // that matters here — a box that CANNOT hold a kiosk lock — and a falsy
      // check would drop exactly that one and report it as "never said".
      ...(profile.deviceOwner !== undefined
        ? { deviceOwner: profile.deviceOwner }
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
      ...(profile.shellVersion ? { shellVersion: profile.shellVersion } : {}),
      ...(profile.runtime ? { runtime: profile.runtime } : {}),
      ...(profile.updateStatus ? { updateStatus: profile.updateStatus } : {}),
      ...(profile.diagnostics ? { diagnostics: profile.diagnostics } : {}),
      // Same reason as the outbound mapper: `false` is the whole point of the
      // field, so it is tested for presence, not for truth. Without this the
      // player reported Device Owner on every heartbeat and the backend dropped
      // it on the floor — a column that existed in the schema and was never once
      // written.
      ...(profile.deviceOwner !== undefined
        ? { deviceOwner: profile.deviceOwner }
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

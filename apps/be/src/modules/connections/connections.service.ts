import { randomBytes, createHash } from 'node:crypto';

import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  oauthDescriptorFor,
  type ResolvedConnection,
} from '@signagewall/apps-contract';

import { BusinessException } from '../../common/exceptions/business.exception';
import { EncryptionService } from '../../common/services/encryption.service';
import { AppInstancesRepository } from '../apps/app-instances.repository';
import { getConnector } from '../apps/connectors/connector-registry';
import { ConnectionsRepository } from './connections.repository';
import { searchCanvaDesigns } from './providers/canva-api';
import {
  fetchSheetTable,
  listGoogleCalendars,
  listGooglePresentations,
  listGoogleSpreadsheets,
} from './providers/google-api';
import {
  fetchWorkbookTable,
  searchDrivePptx,
  searchDriveXlsx,
  unpackDriveItem,
} from './providers/graph-api';
import {
  listMicrosoftCalendars,
  listTeamsChannels,
} from './providers/microsoft-api';
import { listFacebookPages, listInstagramAccounts } from './providers/meta-api';
import { listLinkedInOrganizations } from './providers/linkedin-api';
import {
  listPowerBiReportPages,
  listPowerBiReports,
  listPowerBiWorkspaces,
} from './providers/powerbi-api';
import { canvaOAuthProvider } from './providers/canva.oauth';
import { googleOAuthProvider } from './providers/google.oauth';
import { linkedinOAuthProvider } from './providers/linkedin.oauth';
import { metaOAuthProvider } from './providers/meta.oauth';
import { createMicrosoftOAuthProvider } from './providers/microsoft.oauth';
import type { OAuthProvider } from './providers/oauth-provider';
import {
  AppConnectionDocument,
  ConnectionProvider,
} from './schemas/app-connection.schema';

/** A resource surfaced to a `remote-select` config field (token-free). */
export interface RemoteOption {
  id: string;
  title: string;
  thumbnailUrl?: string;
}

/** Validated, token-free parent ids used by cascading remote pickers. */
export interface RemoteBrowseContext {
  workspaceId?: string;
  reportId?: string;
}

/** Public (token-free) view of a connection for the CMS. */
export interface ConnectionSummary {
  id: string;
  provider: ConnectionProvider;
  accountLabel: string;
  scopes: string[];
  createdAt: string;
}

/** Token-free persisted ownership used for private-asset teardown. */
export interface ConnectionOwnerIdentity {
  id: string;
  organizationId: string;
  appInstanceId: string;
}

/** Signed OAuth `state` payload (CSRF + context binding). */
interface StatePayload {
  organizationId: string;
  userId: string;
  provider: ConnectionProvider;
  appSlug: string;
  /** The instance the resulting connection is bound to (per-instance ownership). */
  instanceId: string;
  /**
   * PKCE code verifier, for providers that require PKCE (Canva). Carried in the
   * signed, short-lived state rather than a server-side store; it never leaves
   * the backend and is consumed once on callback.
   */
  codeVerifier?: string;
}

/** Base64url-encode a buffer (PKCE: no padding, URL-safe alphabet). */
function base64url(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Refresh the access token when it expires within this window. */
const REFRESH_SKEW_MS = 60_000;
const STATE_TTL = '10m';

/**
 * Proactive (scheduler-driven) refresh: renew a connection whose token expires
 * within this window even if nothing fetched it. Wide enough that a Meta token
 * (reported ~30-day expiry) is re-extended well before it closes, and a
 * durable-refresh-token provider (Google/Microsoft) is kept exercised so its
 * refresh token never lapses from inactivity.
 */
const PROACTIVE_REFRESH_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
/**
 * Don't proactively refresh a connection touched (refreshed on a fetch, or by a
 * previous proactive pass) more recently than this — actively-used connections
 * self-heal on fetch, and this spacing also avoids a refresh-token rotation race
 * with a concurrent fetch-driven refresh.
 */
const MIN_REFRESH_SPACING_MS = 5 * 60 * 60 * 1000;

/** Config namespace holding each provider's clientId/clientSecret. */
const PROVIDER_CONFIG_NS: Record<ConnectionProvider, string> = {
  [ConnectionProvider.GOOGLE]: 'google',
  [ConnectionProvider.MICROSOFT]: 'microsoft',
  [ConnectionProvider.CANVA]: 'canva',
  [ConnectionProvider.META]: 'meta',
  [ConnectionProvider.LINKEDIN]: 'linkedin',
};

@Injectable()
export class ConnectionsService {
  private readonly logger = new Logger(ConnectionsService.name);

  constructor(
    private readonly repository: ConnectionsRepository,
    private readonly encryption: EncryptionService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => AppInstancesRepository))
    private readonly appInstancesRepository: AppInstancesRepository,
  ) {}

  /** Whether connected apps can be used at all (encryption key configured). */
  isEnabled(): boolean {
    return this.encryption.isEnabled();
  }

  async list(organizationId: string): Promise<ConnectionSummary[]> {
    const docs = await this.repository.findByOrganization(organizationId);
    return docs.map((doc) => this.toSummary(doc));
  }

  /** Delete the connection owned by an instance (on disconnect / instance delete). */
  async deleteByInstance(
    organizationId: string,
    instanceId: string,
  ): Promise<void> {
    await this.repository.deleteByInstance(organizationId, instanceId);
  }

  /** Delete every connection owned by the given instances (bulk; on uninstall). */
  async deleteByInstances(
    organizationId: string,
    instanceIds: string[],
  ): Promise<void> {
    await this.repository.deleteByInstances(organizationId, instanceIds);
  }

  /**
   * Whether a connection still exists, without throwing and without needing an
   * org scope. For background jobs that must tell "this connection is gone for
   * good" (drop the work) from "resolving it failed this time" (retry later) —
   * {@link resolveConnection} throws for both.
   */
  async connectionExists(id: string): Promise<boolean> {
    return (await this.repository.findByIdUnscoped(id)) !== null;
  }

  async delete(organizationId: string, id: string): Promise<void> {
    const ok = await this.repository.deleteById(organizationId, id);
    if (!ok) {
      throw BusinessException.notFound('Connection not found.');
    }
  }

  /**
   * Assert that connection `id` exists and belongs to `organizationId`. Used
   * when an app instance config references a `connectionId` — without this an
   * org could point an instance at another org's connection, and since the
   * scheduler/webhook resolve connections unscoped (global runtime) that would
   * fan another tenant's private data out onto this org's screens.
   */
  async assertOwned(organizationId: string, id: string): Promise<void> {
    const doc = await this.repository.findById(organizationId, id);
    if (!doc) {
      throw BusinessException.notFound('Connection not found.');
    }
  }

  /** Token-free summary of a connection (for the CMS "Connected as X" header). */
  async getSummary(
    organizationId: string,
    id: string,
  ): Promise<ConnectionSummary> {
    const doc = await this.repository.findById(organizationId, id);
    if (!doc) {
      throw BusinessException.notFound('Connection not found.');
    }
    return this.toSummary(doc);
  }

  /**
   * Assert connection `id` exists, belongs to `organizationId`, AND is owned by
   * `instanceId` — per-instance ownership, so one instance can't reference
   * another instance's (or another tenant's) connection.
   */
  async assertOwnedByInstance(
    organizationId: string,
    instanceId: string,
    id: string,
  ): Promise<void> {
    const doc = await this.repository.findById(organizationId, id);
    if (!doc || doc.instanceId.toString() !== instanceId) {
      throw BusinessException.notFound('Connection not found.');
    }
  }

  /**
   * Resolve only persisted ownership, without decrypting or refreshing OAuth
   * tokens. Cleanup must not depend on the upstream account still being live.
   */
  async getOwnedIdentity(
    organizationId: string,
    instanceId: string,
    id: string,
  ): Promise<ConnectionOwnerIdentity> {
    const doc = await this.repository.findById(organizationId, id);
    if (!doc || doc.instanceId.toString() !== instanceId) {
      throw BusinessException.notFound('Connection not found.');
    }
    return {
      id: doc._id.toString(),
      organizationId: doc.organizationId.toString(),
      appInstanceId: doc.instanceId.toString(),
    };
  }

  /**
   * Build the provider authorization URL for an OAuth start. The scopes come
   * from the connected app's connector OAuth descriptor, so each app requests
   * exactly what it needs.
   */
  async buildAuthorizationUrl(params: {
    organizationId: string;
    userId: string;
    provider: ConnectionProvider;
    appSlug: string;
    instanceId: string;
  }): Promise<string> {
    this.assertEnabled();
    await this.assertOwnedAppInstance(
      params.organizationId,
      params.instanceId,
      params.appSlug,
    );
    const provider = this.getProvider(params.provider);
    const credentials = this.getCredentials(params.provider);
    const scopes = this.scopesForApp(params.appSlug, params.provider);

    // PKCE (Canva requires it): generate a verifier now, stash it in the signed
    // state, and send only its SHA-256 challenge to the provider.
    const usePkce = params.provider === ConnectionProvider.CANVA;
    const codeVerifier = usePkce ? base64url(randomBytes(32)) : undefined;
    const codeChallenge = codeVerifier
      ? base64url(createHash('sha256').update(codeVerifier).digest())
      : undefined;

    const state = this.jwtService.sign(
      {
        organizationId: params.organizationId,
        userId: params.userId,
        provider: params.provider,
        appSlug: params.appSlug,
        instanceId: params.instanceId,
        ...(codeVerifier ? { codeVerifier } : {}),
      } satisfies StatePayload,
      { secret: this.stateSecret(), expiresIn: STATE_TTL },
    );

    return provider.buildAuthorizationUrl({
      clientId: credentials.clientId,
      redirectUri: this.redirectUri(params.provider),
      state,
      scopes,
      ...(params.provider === ConnectionProvider.META
        ? { configurationId: this.metaConfigurationId(params.appSlug) }
        : {}),
      ...(codeChallenge ? { codeChallenge } : {}),
    });
  }

  /**
   * Handle the provider callback: validate `state`, exchange the code, encrypt
   * the tokens, and upsert the connection OWNED BY the instance from the state.
   * Returns the org + instance ids so the controller can bind the connection to
   * the instance config and redirect back to it.
   */
  async handleCallback(
    provider: ConnectionProvider,
    code: string,
    state: string,
  ): Promise<{
    organizationId: string;
    instanceId: string;
    connection: ConnectionSummary;
  }> {
    this.assertEnabled();
    const payload = this.verifyState(state);
    if (String(payload.provider) !== String(provider)) {
      throw BusinessException.badRequest('OAuth state/provider mismatch.');
    }

    // The signed state proves what was requested, not that the target still
    // exists or still belongs to the same tenant. Check before exchanging the
    // authorization code so a foreign/deleted instance can never receive tokens.
    await this.assertOwnedAppInstance(
      payload.organizationId,
      payload.instanceId,
      payload.appSlug,
    );

    const adapter = this.getProvider(provider);
    const credentials = this.getCredentials(provider);
    const result = await adapter.exchangeCode({
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
      redirectUri: this.redirectUri(provider),
      code,
      ...(payload.codeVerifier ? { codeVerifier: payload.codeVerifier } : {}),
    });

    // Re-check after the external round trip. This closes the practical TOCTOU
    // window between state validation and the ownership-scoped upsert.
    await this.assertOwnedAppInstance(
      payload.organizationId,
      payload.instanceId,
      payload.appSlug,
    );

    const doc = await this.repository.upsertByInstance({
      organizationId: payload.organizationId,
      instanceId: payload.instanceId,
      provider,
      accountLabel: result.accountLabel,
      scopes: result.scopes,
      accessTokenEnc: this.encryption.encrypt(result.accessToken),
      ...(result.refreshToken
        ? { refreshTokenEnc: this.encryption.encrypt(result.refreshToken) }
        : {}),
      ...(result.expiresInSeconds
        ? { expiresAt: new Date(Date.now() + result.expiresInSeconds * 1000) }
        : {}),
      createdBy: payload.userId,
    });

    return {
      organizationId: payload.organizationId,
      instanceId: payload.instanceId,
      connection: this.toSummary(doc),
    };
  }

  private async assertOwnedAppInstance(
    organizationId: string,
    instanceId: string,
    appSlug: string,
  ): Promise<void> {
    const instance = await this.appInstancesRepository.findById(
      organizationId,
      instanceId,
    );
    if (!instance || instance.appSlug !== appSlug) {
      throw BusinessException.notFound('App instance not found.');
    }
  }

  /**
   * Resolve a connection to decrypted tokens for a connector fetch, refreshing
   * the access token first if it is expired/expiring. Runs unscoped (the
   * scheduler/webhook operate globally); never returns the encrypted forms.
   */
  async resolveConnection(id: string): Promise<ResolvedConnection> {
    this.assertEnabled();
    const doc = await this.repository.findByIdUnscoped(id);
    if (!doc) {
      throw BusinessException.notFound('Connection not found.');
    }

    let accessToken = this.encryption.decrypt(doc.accessTokenEnc);
    let expiresAt = doc.expiresAt;

    if (this.needsRefresh(doc) && doc.refreshTokenEnc) {
      const refreshed = await this.refreshTokens(doc);
      accessToken = refreshed.accessToken;
      expiresAt = refreshed.expiresAt;
    }

    return {
      id: doc._id.toString(),
      organizationId: doc.organizationId.toString(),
      appInstanceId: doc.instanceId.toString(),
      provider: doc.provider,
      accountLabel: doc.accountLabel,
      accessToken,
      ...(doc.refreshTokenEnc
        ? { refreshToken: this.encryption.decrypt(doc.refreshTokenEnc) }
        : {}),
      ...(expiresAt ? { expiresAt: expiresAt.toISOString() } : {}),
      scopes: doc.scopes,
    };
  }

  /**
   * Search the Canva designs reachable through connection `id` for the CMS
   * picker. Asserts the connection belongs to the org, then resolves it (which
   * refreshes the access token if needed) so the listing never fails on an
   * expired token. Returns token-free summaries only.
   */
  /**
   * List/search the resources a connection exposes for a `remote-select` config
   * field's `remoteSource` (e.g. Canva designs, Google calendars). Asserts the
   * connection belongs to the org, resolves it (refreshing the token so the
   * listing never fails on an expired token), verifies the provider matches the
   * source, then dispatches. Returns token-free `{ id, title, thumbnailUrl? }`.
   */
  async browseRemoteOptions(
    organizationId: string,
    id: string,
    source: string,
    query: string,
    context: RemoteBrowseContext = {},
  ): Promise<RemoteOption[]> {
    await this.assertOwned(organizationId, id);
    const connection = await this.resolveConnection(id);

    switch (source) {
      case 'canva-designs':
        this.assertProvider(connection.provider, ConnectionProvider.CANVA);
        return searchCanvaDesigns(connection.accessToken, query);
      case 'google-calendars':
        this.assertProvider(connection.provider, ConnectionProvider.GOOGLE);
        return listGoogleCalendars(connection.accessToken, query);
      case 'powerpoint-files':
        this.assertProvider(connection.provider, ConnectionProvider.MICROSOFT);
        return searchDrivePptx(connection.accessToken, query);
      case 'excel-files':
        this.assertProvider(connection.provider, ConnectionProvider.MICROSOFT);
        return searchDriveXlsx(connection.accessToken, query);
      case 'google-sheets':
        this.assertProvider(connection.provider, ConnectionProvider.GOOGLE);
        return listGoogleSpreadsheets(connection.accessToken, query);
      case 'google-presentations':
        this.assertProvider(connection.provider, ConnectionProvider.GOOGLE);
        return listGooglePresentations(connection.accessToken, query);
      case 'ms-calendars':
        this.assertProvider(connection.provider, ConnectionProvider.MICROSOFT);
        return listMicrosoftCalendars(connection.accessToken, query);
      case 'ms-teams-channels':
        this.assertProvider(connection.provider, ConnectionProvider.MICROSOFT);
        return listTeamsChannels(connection.accessToken, query);
      case 'meta-pages':
        this.assertProvider(connection.provider, ConnectionProvider.META);
        return listFacebookPages(connection.accessToken, query);
      case 'meta-ig-accounts':
        this.assertProvider(connection.provider, ConnectionProvider.META);
        return listInstagramAccounts(connection.accessToken, query);
      case 'linkedin-orgs':
        this.assertProvider(connection.provider, ConnectionProvider.LINKEDIN);
        return listLinkedInOrganizations(connection.accessToken, query);
      case 'powerbi-workspaces':
        this.assertProvider(connection.provider, ConnectionProvider.MICROSOFT);
        return listPowerBiWorkspaces(connection.accessToken, query);
      case 'powerbi-reports':
        this.assertProvider(connection.provider, ConnectionProvider.MICROSOFT);
        if (!context.workspaceId) {
          throw BusinessException.badRequest(
            'Select a Power BI workspace first.',
          );
        }
        return listPowerBiReports(
          connection.accessToken,
          context.workspaceId,
          query,
        );
      case 'powerbi-pages':
        this.assertProvider(connection.provider, ConnectionProvider.MICROSOFT);
        if (!context.workspaceId || !context.reportId) {
          throw BusinessException.badRequest(
            'Select a Power BI workspace and report first.',
          );
        }
        return listPowerBiReportPages(
          connection.accessToken,
          context.workspaceId,
          context.reportId,
          query,
        );
      default:
        throw BusinessException.badRequest(
          `Unknown browse source "${source}".`,
        );
    }
  }

  private assertProvider(actual: string, expected: ConnectionProvider): void {
    if (actual !== String(expected)) {
      throw BusinessException.badRequest(
        `Connection is not a ${expected} account.`,
      );
    }
  }

  /**
   * The header row of a synced spreadsheet, for the CMS `column-mapping`
   * control. `kind` picks the provider reader ('gsheets' | 'excel'); `fileId`
   * is the picked file's id (Excel: packed `"driveId|itemId"`); `worksheet` may
   * be blank for the first sheet. Same ownership/refresh guarantees as
   * {@link browseRemoteOptions}.
   */
  async fetchTabularHeaders(
    organizationId: string,
    id: string,
    kind: string,
    fileId: string,
    worksheet: string,
  ): Promise<{ headers: string[] }> {
    await this.assertOwned(organizationId, id);
    const connection = await this.resolveConnection(id);

    if (!fileId.trim()) {
      throw BusinessException.badRequest('Missing fileId.');
    }

    switch (kind) {
      case 'gsheets': {
        this.assertProvider(connection.provider, ConnectionProvider.GOOGLE);
        // Header row only — one data row is enough to prove the sheet reads.
        const table = await fetchSheetTable(
          connection.accessToken,
          fileId.trim(),
          worksheet,
          1,
        );
        return { headers: table.headers };
      }
      case 'excel': {
        this.assertProvider(connection.provider, ConnectionProvider.MICROSOFT);
        const unpacked = unpackDriveItem(fileId.trim());
        if (!unpacked) {
          throw BusinessException.badRequest('Invalid workbook id.');
        }
        const table = await fetchWorkbookTable(
          connection.accessToken,
          unpacked.driveId,
          unpacked.itemId,
          worksheet,
          1,
        );
        return { headers: table.headers };
      }
      default:
        throw BusinessException.badRequest(`Unknown tabular kind "${kind}".`);
    }
  }

  private needsRefresh(doc: AppConnectionDocument): boolean {
    if (!doc.expiresAt) {
      return false;
    }
    return doc.expiresAt.getTime() - Date.now() <= REFRESH_SKEW_MS;
  }

  /** True when a connection should be renewed by the proactive scheduler. */
  private isProactivelyDue(doc: AppConnectionDocument, now: number): boolean {
    if (!doc.refreshTokenEnc || !doc.expiresAt) {
      return false;
    }
    // Nearing expiry (or already expired)…
    if (doc.expiresAt.getTime() - now > PROACTIVE_REFRESH_WINDOW_MS) {
      return false;
    }
    // …but not one a recent fetch (or a previous pass) already refreshed.
    const updatedAt = doc.updatedAt?.getTime() ?? 0;
    return now - updatedAt >= MIN_REFRESH_SPACING_MS;
  }

  /**
   * Proactively renew connections whose token is nearing expiry, regardless of
   * whether anything fetched them. Runs on a schedule so an idle connection's
   * session never lapses — the live-sync apps must never go dark, and Meta
   * tokens (no refresh token; re-extended inside {@link refreshTokens}) must be
   * renewed before their window closes even when the instance is briefly unused.
   * Never throws: each connection's failure is isolated and logged.
   */
  async refreshExpiring(
    now: Date = new Date(),
  ): Promise<{ refreshed: number; failed: number; skipped: number }> {
    const docs = await this.repository.findRefreshable();
    const nowMs = now.getTime();
    let refreshed = 0;
    let failed = 0;
    let skipped = 0;
    for (const doc of docs) {
      if (!this.isProactivelyDue(doc, nowMs)) {
        skipped += 1;
        continue;
      }
      try {
        await this.refreshTokens(doc);
        refreshed += 1;
      } catch (error) {
        failed += 1;
        this.logger.warn(
          `Proactive token refresh failed for connection ${doc._id.toString()} (${doc.provider})`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
    if (refreshed > 0 || failed > 0) {
      this.logger.log(
        `Proactive token refresh: ${refreshed} renewed, ${failed} failed, ${skipped} skipped`,
      );
    }
    return { refreshed, failed, skipped };
  }

  private async refreshTokens(
    doc: AppConnectionDocument,
  ): Promise<{ accessToken: string; expiresAt?: Date }> {
    const adapter = this.getProvider(doc.provider);
    const credentials = this.getCredentials(doc.provider);
    const refreshToken = this.encryption.decrypt(doc.refreshTokenEnc!);

    const tokens = await adapter.refresh({
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
      refreshToken,
    });

    const expiresAt = tokens.expiresInSeconds
      ? new Date(Date.now() + tokens.expiresInSeconds * 1000)
      : undefined;

    await this.repository.updateTokens(doc._id.toString(), {
      accessTokenEnc: this.encryption.encrypt(tokens.accessToken),
      // Providers may rotate the refresh token; persist the new one if present.
      ...(tokens.refreshToken
        ? { refreshTokenEnc: this.encryption.encrypt(tokens.refreshToken) }
        : {}),
      ...(expiresAt ? { expiresAt } : {}),
    });

    return {
      accessToken: tokens.accessToken,
      ...(expiresAt ? { expiresAt } : {}),
    };
  }

  private scopesForApp(
    appSlug: string,
    provider: ConnectionProvider,
  ): string[] {
    // Multi-provider connectors (e.g. the menu board syncing from Google
    // Sheets OR Excel) declare one descriptor per provider.
    const oauth = oauthDescriptorFor(getConnector(appSlug), String(provider));
    if (!oauth) {
      throw BusinessException.badRequest(
        `App "${appSlug}" has no ${provider} OAuth descriptor.`,
      );
    }
    return oauth.scopes;
  }

  /** Lazily built once (tenant is process-constant), like the other singletons. */
  private microsoftProvider?: OAuthProvider;

  private getProvider(provider: ConnectionProvider): OAuthProvider {
    switch (provider) {
      case ConnectionProvider.GOOGLE:
        return googleOAuthProvider;
      case ConnectionProvider.MICROSOFT:
        this.microsoftProvider ??= createMicrosoftOAuthProvider(
          this.configService.get<string>('microsoft.tenant') ?? 'common',
        );
        return this.microsoftProvider;
      case ConnectionProvider.META:
        return metaOAuthProvider;
      case ConnectionProvider.LINKEDIN:
        return linkedinOAuthProvider;
      default:
        return canvaOAuthProvider;
    }
  }

  private getCredentials(provider: ConnectionProvider): {
    clientId: string;
    clientSecret: string;
  } {
    const ns = PROVIDER_CONFIG_NS[provider];
    const clientId = this.configService.get<string>(`${ns}.clientId`);
    const clientSecret = this.configService.get<string>(`${ns}.clientSecret`);
    if (!clientId || !clientSecret) {
      throw BusinessException.badRequest(
        `${provider} OAuth is not configured on this server.`,
      );
    }
    return { clientId, clientSecret };
  }

  /**
   * Select the least-privilege Business Login configuration for this connector.
   * The shared id is a deliberate fallback for local testing and migrations.
   */
  private metaConfigurationId(appSlug: string): string | undefined {
    const connectorKey =
      appSlug === 'facebook'
        ? 'meta.facebookConfigurationId'
        : appSlug === 'instagram'
          ? 'meta.instagramConfigurationId'
          : undefined;
    const connectorId = connectorKey
      ? this.configService.get<string>(connectorKey)?.trim()
      : undefined;
    const sharedId = this.configService
      .get<string>('meta.configurationId')
      ?.trim();

    // Optional env vars commonly exist as blank strings in copied .env files.
    // A blank per-connector override must not shadow the shared configuration.
    return connectorId || sharedId || undefined;
  }

  private redirectUri(provider: ConnectionProvider): string {
    const base =
      this.configService.get<string>('publicApiUrl') ??
      `http://localhost:${this.configService.get<number>('port') ?? 3000}`;
    const prefix = this.configService.get<string>('apiPrefix') ?? 'api';
    return `${base.replace(/\/$/, '')}/${prefix}/v1/connections/oauth/${provider}/callback`;
  }

  private verifyState(state: string): StatePayload {
    try {
      return this.jwtService.verify<StatePayload>(state, {
        secret: this.stateSecret(),
      });
    } catch {
      throw BusinessException.badRequest('Invalid or expired OAuth state.');
    }
  }

  private stateSecret(): string {
    // Reuse the access-token secret to sign the short-lived state JWT.
    return this.configService.getOrThrow<string>('jwt.accessSecret');
  }

  private assertEnabled(): void {
    if (!this.isEnabled()) {
      throw BusinessException.badRequest(
        'Connected apps are disabled (ENCRYPTION_KEY not set).',
      );
    }
  }

  private toSummary(doc: AppConnectionDocument): ConnectionSummary {
    return {
      id: doc._id.toString(),
      provider: doc.provider,
      accountLabel: doc.accountLabel,
      scopes: doc.scopes,
      createdAt: doc.createdAt.toISOString(),
    };
  }
}

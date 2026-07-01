import { randomBytes, createHash } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { ResolvedConnection } from '@edge/apps-contract';

import { BusinessException } from '../../common/exceptions/business.exception';
import { EncryptionService } from '../../common/services/encryption.service';
import { getConnector } from '../apps/connectors/connector-registry';
import { ConnectionsRepository } from './connections.repository';
import {
  type CanvaDesignSummary,
  searchCanvaDesigns,
} from './providers/canva-api';
import { canvaOAuthProvider } from './providers/canva.oauth';
import { googleOAuthProvider } from './providers/google.oauth';
import { createMicrosoftOAuthProvider } from './providers/microsoft.oauth';
import type { OAuthProvider } from './providers/oauth-provider';
import {
  AppConnectionDocument,
  ConnectionProvider,
} from './schemas/app-connection.schema';

/** Public (token-free) view of a connection for the CMS. */
export interface ConnectionSummary {
  id: string;
  provider: ConnectionProvider;
  accountLabel: string;
  scopes: string[];
  createdAt: string;
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

/** Config namespace holding each provider's clientId/clientSecret. */
const PROVIDER_CONFIG_NS: Record<ConnectionProvider, string> = {
  [ConnectionProvider.GOOGLE]: 'google',
  [ConnectionProvider.MICROSOFT]: 'microsoft',
  [ConnectionProvider.CANVA]: 'canva',
};

@Injectable()
export class ConnectionsService {
  private readonly logger = new Logger(ConnectionsService.name);

  constructor(
    private readonly repository: ConnectionsRepository,
    private readonly encryption: EncryptionService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
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
   * Build the provider authorization URL for an OAuth start. The scopes come
   * from the connected app's connector OAuth descriptor, so each app requests
   * exactly what it needs.
   */
  buildAuthorizationUrl(params: {
    organizationId: string;
    userId: string;
    provider: ConnectionProvider;
    appSlug: string;
    instanceId: string;
  }): string {
    this.assertEnabled();
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

    const adapter = this.getProvider(provider);
    const credentials = this.getCredentials(provider);
    const result = await adapter.exchangeCode({
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
      redirectUri: this.redirectUri(provider),
      code,
      ...(payload.codeVerifier ? { codeVerifier: payload.codeVerifier } : {}),
    });

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
  async listCanvaDesigns(
    organizationId: string,
    id: string,
    query: string,
  ): Promise<CanvaDesignSummary[]> {
    await this.assertOwned(organizationId, id);
    const connection = await this.resolveConnection(id);
    if (connection.provider !== String(ConnectionProvider.CANVA)) {
      throw BusinessException.badRequest('Connection is not a Canva account.');
    }
    return searchCanvaDesigns(connection.accessToken, query);
  }

  private needsRefresh(doc: AppConnectionDocument): boolean {
    if (!doc.expiresAt) {
      return false;
    }
    return doc.expiresAt.getTime() - Date.now() <= REFRESH_SKEW_MS;
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
    const oauth = getConnector(appSlug)?.oauth;
    if (!oauth || oauth.provider !== String(provider)) {
      throw BusinessException.badRequest(
        `App "${appSlug}" has no ${provider} OAuth descriptor.`,
      );
    }
    return oauth.scopes;
  }

  private getProvider(provider: ConnectionProvider): OAuthProvider {
    if (provider === ConnectionProvider.GOOGLE) {
      return googleOAuthProvider;
    }
    if (provider === ConnectionProvider.CANVA) {
      return canvaOAuthProvider;
    }
    return createMicrosoftOAuthProvider(
      this.configService.get<string>('microsoft.tenant') ?? 'common',
    );
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

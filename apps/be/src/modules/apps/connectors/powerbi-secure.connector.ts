import { createHash } from 'node:crypto';

import type {
  AppConnector,
  ConnectorResult,
  PrivateAssetRef,
  ResolvedConnection,
} from '@signagewall/apps-contract';
import type {
  SecurePowerBiConfig,
  SecurePowerBiPayload,
} from '@signagewall/apps';

import {
  POWER_BI_SNAPSHOT_DELEGATED_SCOPES,
  PowerBiApiError,
} from '../../connections/providers/powerbi-api';
import type { PrivateAssetOwner } from '../../media/storage/private-r2-storage.service';
import {
  POWERBI_EXPORT_MAX_DOWNLOAD_BYTES,
  UnsafePowerBiExportError,
  parsePowerBiPngExport,
} from './powerbi-secure/png-export';
import {
  type PowerBiExportApi,
  type PowerBiExportJobStatus,
  powerBiExportApi,
} from './powerbi-secure/powerbi-export-api';
import {
  type PowerBiPrivateStorage,
  getPowerBiPrivateStorage,
} from './powerbi-secure/storage.registry';

const JOB_MAX_AGE_MS = 30 * 60 * 1000;
const CONNECTOR_VERSION = 'png-v1';
const DEFAULT_REFRESH_MINUTES = 15;
const MIN_REFRESH_MINUTES = 5;
const MAX_REFRESH_MINUTES = 1440;

interface PowerBiJobState {
  id: string;
  workspaceId: string;
  reportId: string;
  pageName?: string;
  startedAt: string;
}

interface PowerBiRenderedState {
  version: string;
  reportName: string;
  exportedAt: string;
  pages: PrivateAssetRef[];
}

interface PowerBiFailureState {
  code: string;
  message: string;
  at: string;
  retryAt?: string;
}

interface PowerBiConnectorState {
  job?: PowerBiJobState;
  rendered?: PowerBiRenderedState;
  lastError?: PowerBiFailureState;
}

interface PowerBiConnectorDependencies {
  api?: PowerBiExportApi;
  storage?: PowerBiPrivateStorage;
  now?: () => Date;
}

type RuntimeSecurePowerBiConfig = Partial<SecurePowerBiConfig>;

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function configIds(config: RuntimeSecurePowerBiConfig) {
  return {
    connectionId: clean(config.connectionId),
    workspaceId: clean(config.workspace?.id),
    reportId: clean(config.report?.id),
    pageName: clean(config.page?.id),
  };
}

type PowerBiConnectionOwner = Pick<
  ResolvedConnection,
  'id' | 'organizationId' | 'appInstanceId'
>;

function ownerFrom(connection: PowerBiConnectionOwner): PrivateAssetOwner {
  if (
    !clean(connection.organizationId) ||
    !clean(connection.appInstanceId) ||
    !clean(connection.id)
  ) {
    throw new Error('powerbi-secure: connection ownership is incomplete');
  }
  return {
    organizationId: connection.organizationId,
    appInstanceId: connection.appInstanceId,
    connectionId: connection.id,
  };
}

function hashParts(parts: readonly (string | Buffer)[]): string {
  const hash = createHash('sha256');
  for (const part of parts) {
    const value = Buffer.isBuffer(part) ? part : Buffer.from(part);
    const length = Buffer.allocUnsafe(8);
    length.writeBigUInt64BE(BigInt(value.length));
    hash.update(length).update(value);
  }
  return hash.digest('hex');
}

function isPrivateRef(value: unknown): value is PrivateAssetRef {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const ref = value as Partial<PrivateAssetRef>;
  return (
    ref.kind === 'private-asset' &&
    typeof ref.key === 'string' &&
    typeof ref.version === 'string' &&
    typeof ref.mimeType === 'string' &&
    !('url' in value)
  );
}

function readState(
  secrets: Record<string, unknown> | undefined,
): PowerBiConnectorState {
  const raw = secrets?.powerBiSecure;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const value = raw as Record<string, unknown>;
  const result: PowerBiConnectorState = {};

  const job = value.job;
  if (job && typeof job === 'object' && !Array.isArray(job)) {
    const candidate = job as Partial<PowerBiJobState>;
    if (
      typeof candidate.id === 'string' &&
      typeof candidate.workspaceId === 'string' &&
      typeof candidate.reportId === 'string' &&
      typeof candidate.startedAt === 'string' &&
      (candidate.pageName === undefined ||
        typeof candidate.pageName === 'string')
    ) {
      result.job = candidate as PowerBiJobState;
    }
  }

  const rendered = value.rendered;
  if (rendered && typeof rendered === 'object' && !Array.isArray(rendered)) {
    const candidate = rendered as Partial<PowerBiRenderedState>;
    if (
      typeof candidate.version === 'string' &&
      typeof candidate.reportName === 'string' &&
      typeof candidate.exportedAt === 'string' &&
      Array.isArray(candidate.pages) &&
      candidate.pages.length > 0 &&
      candidate.pages.every(isPrivateRef)
    ) {
      result.rendered = candidate as PowerBiRenderedState;
    }
  }

  const lastError = value.lastError;
  if (lastError && typeof lastError === 'object' && !Array.isArray(lastError)) {
    const candidate = lastError as Partial<PowerBiFailureState>;
    if (
      typeof candidate.code === 'string' &&
      typeof candidate.message === 'string' &&
      typeof candidate.at === 'string' &&
      (candidate.retryAt === undefined || typeof candidate.retryAt === 'string')
    ) {
      result.lastError = candidate as PowerBiFailureState;
    }
  }
  return result;
}

function persisted(state: PowerBiConnectorState): Record<string, unknown> {
  return { powerBiSecure: state };
}

function isSameSelection(
  job: PowerBiJobState,
  ids: ReturnType<typeof configIds>,
): boolean {
  return (
    job.workspaceId === ids.workspaceId &&
    job.reportId === ids.reportId &&
    (job.pageName ?? '') === ids.pageName
  );
}

function lastKnownResult(
  rendered: PowerBiRenderedState,
  state: PowerBiConnectorState,
): ConnectorResult<SecurePowerBiPayload> {
  return {
    playerPayload: {
      reportName: rendered.reportName,
      pages: rendered.pages,
      exportedAt: rendered.exportedAt,
      sourceVersion: rendered.version,
    },
    version: rendered.version,
    secrets: persisted(state),
  };
}

function pending(
  state: PowerBiConnectorState,
): ConnectorResult<SecurePowerBiPayload> {
  return { pending: true, secrets: persisted(state) };
}

function pendingFailure(
  state: PowerBiConnectorState,
  message: string,
): ConnectorResult<SecurePowerBiPayload> {
  // `error` is part of the integration contract; assigning through an inferred
  // value keeps this branch buildable while the shared package change lands.
  const result = { ...pending(state), error: message };
  return result;
}

function failedJob(
  previous: PowerBiConnectorState,
  now: Date,
  code: string,
  message: string,
  retryAfterMs = 5 * 60 * 1000,
): ConnectorResult<SecurePowerBiPayload> {
  return pendingFailure(
    {
      ...(previous.rendered ? { rendered: previous.rendered } : {}),
      lastError: {
        code,
        message,
        at: now.toISOString(),
        retryAt: new Date(now.getTime() + retryAfterMs).toISOString(),
      },
    },
    message,
  );
}

function upstreamFailure(
  previous: PowerBiConnectorState,
  job: PowerBiJobState | undefined,
  error: PowerBiApiError,
  now: Date,
): ConnectorResult<SecurePowerBiPayload> {
  const retrySeconds =
    error.code === 'THROTTLED'
      ? Math.max(1, error.retryAfterSeconds ?? 60)
      : error.code === 'UPSTREAM_ERROR'
        ? 60
        : 5 * 60;
  return pendingFailure(
    {
      ...(job ? { job } : {}),
      ...(previous.rendered ? { rendered: previous.rendered } : {}),
      lastError: {
        code: error.code,
        message: error.message,
        at: now.toISOString(),
        retryAt: new Date(now.getTime() + retrySeconds * 1000).toISOString(),
      },
    },
    error.message,
  );
}

function retryDeferred(state: PowerBiConnectorState, now: Date): boolean {
  const retryAt = state.lastError?.retryAt
    ? Date.parse(state.lastError.retryAt)
    : Number.NaN;
  return Number.isFinite(retryAt) && retryAt > now.getTime();
}

function statusFailure(status: PowerBiExportJobStatus): string {
  return status.status === 'failed'
    ? 'Power BI could not export this report. Verify capacity, tenant export settings, report permissions, and unsupported visuals or sensitivity labels.'
    : 'Power BI export did not complete.';
}

/**
 * Snapshot connector factory. Production resolves private storage through the
 * DI bridge; tests inject a narrow in-memory implementation.
 */
export function createPowerBiSecureConnector(
  dependencies: PowerBiConnectorDependencies = {},
): AppConnector<RuntimeSecurePowerBiConfig, SecurePowerBiPayload> {
  const api = dependencies.api ?? powerBiExportApi;
  const now = dependencies.now ?? (() => new Date());

  return {
    oauth: {
      provider: 'microsoft',
      authorizationUrl:
        'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      scopes: [...POWER_BI_SNAPSHOT_DELEGATED_SCOPES],
    },

    // Each invocation performs one short REST phase. The long-running export is
    // resumed by job id on later scheduler ticks.
    timeoutMs: 20_000,

    refreshSeconds(config) {
      const requested = Number(config.refreshMinutes);
      const minutes =
        Number.isFinite(requested) && Number.isInteger(requested)
          ? Math.min(
              MAX_REFRESH_MINUTES,
              Math.max(MIN_REFRESH_MINUTES, requested),
            )
          : DEFAULT_REFRESH_MINUTES;
      return minutes * 60;
    },

    cacheKey(config) {
      const ids = configIds(config);
      if (!ids.connectionId || !ids.workspaceId || !ids.reportId) return '';
      return [
        'powerbi-secure',
        CONNECTOR_VERSION,
        ids.connectionId,
        ids.workspaceId,
        ids.reportId,
        ids.pageName || 'all-pages',
      ].join(':');
    },

    async fetchData(config, ctx) {
      const connection = ctx.connection;
      if (!connection)
        throw new Error('powerbi-secure: no connection resolved');
      if (connection.provider !== 'microsoft') {
        throw new Error('powerbi-secure: Microsoft connection required');
      }
      const ids = configIds(config);
      if (!ids.workspaceId || !ids.reportId) {
        throw new Error('powerbi-secure: workspace and report are required');
      }
      if (ids.connectionId && ids.connectionId !== connection.id) {
        throw new Error('powerbi-secure: resolved connection mismatch');
      }

      const storage = dependencies.storage ?? getPowerBiPrivateStorage();
      if (!storage?.isConfigured()) {
        throw new Error(
          'powerbi-secure: private asset storage is not configured',
        );
      }
      const owner = ownerFrom(connection);
      const previous = readState(ctx.secrets);
      const instant = now();
      if (!Number.isFinite(instant.getTime())) {
        throw new Error('powerbi-secure: invalid system time');
      }

      const job = previous.job;
      if (job && isSameSelection(job, ids)) {
        const startedAt = Date.parse(job.startedAt);
        if (
          !Number.isFinite(startedAt) ||
          instant.getTime() - startedAt > JOB_MAX_AGE_MS
        ) {
          ctx.logger.warn('powerbi-secure export expired', {
            hasLastKnownGood: Boolean(previous.rendered),
          });
          return failedJob(
            previous,
            instant,
            'EXPORT_TIMEOUT',
            'Power BI export timed out. A new snapshot will be requested.',
          );
        }

        if (retryDeferred(previous, instant)) {
          return pendingFailure(previous, previous.lastError!.message);
        }

        let status: PowerBiExportJobStatus;
        try {
          status = await api.poll({
            accessToken: connection.accessToken,
            workspaceId: ids.workspaceId,
            reportId: ids.reportId,
            exportId: job.id,
            ...(ctx.signal ? { signal: ctx.signal } : {}),
          });
        } catch (error) {
          if (error instanceof PowerBiApiError) {
            return upstreamFailure(previous, job, error, instant);
          }
          throw error;
        }
        if (status.status === 'not-started' || status.status === 'running') {
          ctx.logger.debug('powerbi-secure export pending', {
            status: status.status,
            ...(status.percentComplete !== undefined
              ? { percentComplete: status.percentComplete }
              : {}),
          });
          return pending({
            job,
            ...(previous.rendered ? { rendered: previous.rendered } : {}),
          });
        }
        if (status.status === 'failed') {
          ctx.logger.warn('powerbi-secure export failed', {
            hasLastKnownGood: Boolean(previous.rendered),
          });
          return failedJob(
            previous,
            instant,
            'EXPORT_FAILED',
            statusFailure(status),
          );
        }

        let download: Buffer;
        try {
          download = await api.download({
            accessToken: connection.accessToken,
            workspaceId: ids.workspaceId,
            reportId: ids.reportId,
            exportId: job.id,
            maxBytes: POWERBI_EXPORT_MAX_DOWNLOAD_BYTES,
            ...(ctx.signal ? { signal: ctx.signal } : {}),
          });
        } catch (error) {
          if (error instanceof PowerBiApiError) {
            return upstreamFailure(previous, job, error, instant);
          }
          throw error;
        }
        let pages: ReturnType<typeof parsePowerBiPngExport>;
        try {
          pages = parsePowerBiPngExport(download);
        } catch (error) {
          if (!(error instanceof UnsafePowerBiExportError)) throw error;
          ctx.logger.warn('powerbi-secure export rejected by safe parser', {
            hasLastKnownGood: Boolean(previous.rendered),
          });
          return failedJob(
            previous,
            instant,
            'UNSAFE_EXPORT',
            'Power BI returned an export that could not be safely processed. The last successful snapshot remains on screen.',
          );
        }
        const version = hashParts([
          CONNECTOR_VERSION,
          ids.workspaceId,
          ids.reportId,
          ids.pageName || 'all-pages',
          ...pages.flatMap((page) => [page.filename, page.body]),
        ]);
        const reportName = clean(config.report?.label) || 'Power BI report';

        if (previous.rendered?.version === version) {
          const rendered = { ...previous.rendered, reportName };
          ctx.logger.debug('powerbi-secure snapshot unchanged', {
            pages: rendered.pages.length,
          });
          return lastKnownResult(rendered, { rendered });
        }

        const uploaded: PrivateAssetRef[] = [];
        try {
          for (const page of pages) {
            uploaded.push(
              await storage.uploadAsset({
                owner,
                version,
                filename: page.filename,
                body: page.body,
                mimeType: 'image/png',
              }),
            );
          }
        } catch (error) {
          await storage.deleteAssetSet(owner, uploaded).catch(() => undefined);
          ctx.logger.warn('powerbi-secure private snapshot upload failed', {
            hasLastKnownGood: Boolean(previous.rendered),
            partialAssets: uploaded.length,
          });
          return failedJob(
            previous,
            instant,
            'STORAGE_UNAVAILABLE',
            'Secure snapshot storage is temporarily unavailable. The last successful snapshot remains on screen.',
          );
        }

        const rendered: PowerBiRenderedState = {
          version,
          reportName,
          exportedAt: instant.toISOString(),
          pages: uploaded,
        };
        if (previous.rendered?.pages.length) {
          await storage
            .deleteReplacedAssets(owner, previous.rendered.pages, uploaded)
            .catch(() => undefined);
        }
        ctx.logger.debug('powerbi-secure snapshot stored', {
          pages: uploaded.length,
          version: version.slice(0, 12),
        });
        return lastKnownResult(rendered, { rendered });
      }

      // A mismatching persisted job belongs to an old selection and is ignored;
      // it contains no asset and therefore needs no object cleanup.
      if (retryDeferred(previous, instant)) {
        return pendingFailure(previous, previous.lastError!.message);
      }
      let started: PowerBiExportJobStatus;
      try {
        started = await api.start({
          accessToken: connection.accessToken,
          workspaceId: ids.workspaceId,
          reportId: ids.reportId,
          ...(ids.pageName ? { pageName: ids.pageName } : {}),
          ...(ctx.signal ? { signal: ctx.signal } : {}),
        });
      } catch (error) {
        if (error instanceof PowerBiApiError) {
          return upstreamFailure(previous, undefined, error, instant);
        }
        throw error;
      }
      if (started.status === 'failed') {
        return failedJob(
          previous,
          instant,
          'EXPORT_FAILED',
          statusFailure(started),
        );
      }

      const nextJob: PowerBiJobState = {
        id: started.id,
        workspaceId: ids.workspaceId,
        reportId: ids.reportId,
        ...(ids.pageName ? { pageName: ids.pageName } : {}),
        startedAt: instant.toISOString(),
      };
      ctx.logger.debug('powerbi-secure export started', {
        scope: ids.pageName ? 'single-page' : 'all-pages',
      });
      return pending({
        job: nextJob,
        ...(previous.rendered ? { rendered: previous.rendered } : {}),
      });
    },
  };
}

export const powerbiSecureConnector = createPowerBiSecureConnector();

/**
 * Deterministic deletion hook for connection/app-instance teardown. The host
 * supplies the persisted cache secrets it is about to remove; config owner
 * fields are deliberately not accepted.
 */
export async function cleanupPowerBiSecureState(
  connection: PowerBiConnectionOwner,
  secrets: Record<string, unknown> | undefined,
  storage: PowerBiPrivateStorage | undefined = getPowerBiPrivateStorage(),
): Promise<void> {
  const rendered = readState(secrets).rendered;
  if (!rendered?.pages.length) return;
  if (!storage?.isConfigured()) {
    throw new Error('powerbi-secure: private asset storage is not configured');
  }
  await storage.deleteAssetSet(ownerFrom(connection), rendered.pages);
}

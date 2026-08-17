import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac } from 'crypto';
import { basename } from 'path';
import { Readable } from 'stream';
import type { PrivateAssetRef } from '@signagewall/apps-contract';

const PRIVATE_ASSET_KEY_ROOT = 'private-assets/v1';
const DEFAULT_SIGNED_URL_TTL_SECONDS = 15 * 60;
const MAX_SIGNED_URL_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface PrivateAssetOwner {
  organizationId: string;
  appInstanceId: string;
  connectionId: string;
}

export interface PrivateAssetUpload {
  owner: PrivateAssetOwner;
  version: string;
  filename: string;
  body: Buffer;
  mimeType: string;
}

export interface PrivateAssetDownload {
  body: Buffer;
  contentType?: string;
}

export interface PrivateAssetStream {
  stream: Readable;
  contentType?: string;
  contentLength?: number;
}

interface PrivateR2Credentials {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

export interface PresignPrivateR2GetOptions extends PrivateR2Credentials {
  key: string;
  expiresInSeconds: number;
  now?: Date;
}

/**
 * Environment/configuration owned by INT-01:
 *
 * - `PRIVATE_R2_ACCOUNT_ID` -> `privateR2.accountId`
 * - `PRIVATE_R2_ACCESS_KEY_ID` -> `privateR2.accessKeyId`
 * - `PRIVATE_R2_SECRET_ACCESS_KEY` -> `privateR2.secretAccessKey`
 * - `PRIVATE_R2_BUCKET` -> `privateR2.bucket`
 * - `PRIVATE_R2_SIGNED_URL_TTL_SECONDS` -> `privateR2.signedUrlTtlSeconds`
 *
 * These keys intentionally have no public URL setting and never fall back to
 * the existing public `r2.*` configuration.
 */
@Injectable()
export class PrivateR2StorageService implements OnModuleInit {
  private readonly logger = new Logger(PrivateR2StorageService.name);
  private client: S3Client | null = null;
  private credentials: PrivateR2Credentials | null = null;
  private signedUrlTtlSeconds = DEFAULT_SIGNED_URL_TTL_SECONDS;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const accountId = this.readConfig('privateR2.accountId');
    const accessKeyId = this.readConfig('privateR2.accessKeyId');
    const rawSecret = this.readConfig('privateR2.secretAccessKey');
    const bucket = this.readConfig('privateR2.bucket');

    if (!accountId || !accessKeyId || !rawSecret || !bucket) {
      this.logger.warn(
        'Private R2 storage is not configured; private asset operations are disabled',
      );
      return;
    }

    const publicBucket = this.readConfig('r2.bucket');
    if (publicBucket && publicBucket === bucket) {
      this.logger.error(
        'Private R2 storage cannot use the public media bucket; private asset operations are disabled',
      );
      return;
    }

    const configuredTtl = this.configService.get<number | string>(
      'privateR2.signedUrlTtlSeconds',
    );
    this.signedUrlTtlSeconds = normalizeSignedUrlTtl(configuredTtl);
    this.credentials = {
      accountId,
      accessKeyId,
      secretAccessKey: resolveR2SecretAccessKey(rawSecret),
      bucket,
    };
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey: this.credentials.secretAccessKey,
      },
      forcePathStyle: true,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });

    void this.verifyConnection();
  }

  isConfigured(): boolean {
    return this.client !== null && this.credentials !== null;
  }

  /** Build an immutable key scoped to tenant, instance, connection and version. */
  buildObjectKey(
    owner: PrivateAssetOwner,
    version: string,
    filename: string,
  ): string {
    return [
      PRIVATE_ASSET_KEY_ROOT,
      'organizations',
      encodeKeySegment(owner.organizationId, 'organizationId'),
      'instances',
      encodeKeySegment(owner.appInstanceId, 'appInstanceId'),
      'connections',
      encodeKeySegment(owner.connectionId, 'connectionId'),
      'versions',
      encodeKeySegment(version, 'version'),
      sanitizeFilename(filename),
    ].join('/');
  }

  ownsKey(owner: PrivateAssetOwner, key: string): boolean {
    const prefix = [
      PRIVATE_ASSET_KEY_ROOT,
      'organizations',
      encodeKeySegment(owner.organizationId, 'organizationId'),
      'instances',
      encodeKeySegment(owner.appInstanceId, 'appInstanceId'),
      'connections',
      encodeKeySegment(owner.connectionId, 'connectionId'),
      'versions',
    ].join('/');

    return key.startsWith(`${prefix}/`) && isSafePrivateObjectKey(key);
  }

  async uploadAsset(upload: PrivateAssetUpload): Promise<PrivateAssetRef> {
    const client = this.requireClient();
    const credentials = this.requireCredentials();
    if (!upload.mimeType.trim()) {
      throw new Error('Private asset MIME type is required');
    }

    const key = this.buildObjectKey(
      upload.owner,
      upload.version,
      upload.filename,
    );
    await client.send(
      new PutObjectCommand({
        Bucket: credentials.bucket,
        Key: key,
        Body: upload.body,
        ContentType: upload.mimeType,
      }),
    );
    this.logObjectEvent('private_asset_uploaded', key, upload.version);

    return {
      kind: 'private-asset',
      key,
      version: upload.version,
      mimeType: upload.mimeType,
    };
  }

  /**
   * NOT wired to any route yet — today every consumer takes a signed URL and
   * fetches R2 directly, which is cheaper. Kept because proxying through the
   * backend is what SEC-03 (signed-URL renewal) and any future
   * CORS-restricted-player path need, and because both methods share
   * `getAuthorizedObject`, so the ownership check cannot drift from the
   * signing path. Their specs assert that check, not a live route.
   */
  async downloadAsset(
    owner: PrivateAssetOwner,
    ref: PrivateAssetRef,
  ): Promise<PrivateAssetDownload> {
    const response = await this.getAuthorizedObject(owner, ref);
    if (!response.Body) {
      throw new Error('Empty private object body');
    }

    return {
      body: Buffer.from(await response.Body.transformToByteArray()),
      ...(response.ContentType ? { contentType: response.ContentType } : {}),
    };
  }

  async streamAsset(
    owner: PrivateAssetOwner,
    ref: PrivateAssetRef,
  ): Promise<PrivateAssetStream> {
    const response = await this.getAuthorizedObject(owner, ref);
    if (!response.Body) {
      throw new Error('Empty private object body');
    }

    return {
      stream: response.Body as Readable,
      ...(response.ContentType ? { contentType: response.ContentType } : {}),
      ...(response.ContentLength !== undefined
        ? { contentLength: response.ContentLength }
        : {}),
    };
  }

  signGetUrl(
    owner: PrivateAssetOwner,
    ref: PrivateAssetRef,
    expiresInSeconds = this.signedUrlTtlSeconds,
    now = new Date(),
  ): string {
    this.assertOwnedRef(owner, ref);
    const credentials = this.requireCredentials();
    return presignPrivateR2GetUrl({
      ...credentials,
      key: ref.key,
      expiresInSeconds: normalizeSignedUrlTtl(expiresInSeconds),
      now,
    });
  }

  async deleteAsset(
    owner: PrivateAssetOwner,
    ref: PrivateAssetRef,
  ): Promise<void> {
    this.assertOwnedRef(owner, ref);
    const client = this.requireClient();
    const credentials = this.requireCredentials();
    await client.send(
      new DeleteObjectCommand({
        Bucket: credentials.bucket,
        Key: ref.key,
      }),
    );
    this.logObjectEvent('private_asset_deleted', ref.key, ref.version);
  }

  async deleteAssetSet(
    owner: PrivateAssetOwner,
    refs: readonly PrivateAssetRef[],
  ): Promise<void> {
    const unique = uniqueRefs(refs);
    for (const ref of unique) {
      this.assertOwnedRef(owner, ref);
    }
    await Promise.all(unique.map((ref) => this.deleteAsset(owner, ref)));
  }

  /** Best-effort cleanup hook for an export that replaced an older asset set. */
  async deleteReplacedAssets(
    owner: PrivateAssetOwner,
    previous: readonly PrivateAssetRef[],
    current: readonly PrivateAssetRef[],
  ): Promise<void> {
    const retainedKeys = new Set(current.map((ref) => ref.key));
    await this.deleteAssetSet(
      owner,
      previous.filter((ref) => !retainedKeys.has(ref.key)),
    );
  }

  private async getAuthorizedObject(
    owner: PrivateAssetOwner,
    ref: PrivateAssetRef,
  ) {
    this.assertOwnedRef(owner, ref);
    const client = this.requireClient();
    const credentials = this.requireCredentials();
    return client.send(
      new GetObjectCommand({
        Bucket: credentials.bucket,
        Key: ref.key,
      }),
    );
  }

  private assertOwnedRef(owner: PrivateAssetOwner, ref: PrivateAssetRef): void {
    if (!this.ownsKey(owner, ref.key)) {
      throw new Error('Private asset ownership mismatch');
    }
    const versionSegment = `/versions/${encodeKeySegment(ref.version, 'version')}/`;
    if (!ref.key.includes(versionSegment)) {
      throw new Error('Private asset version mismatch');
    }
  }

  private requireClient(): S3Client {
    if (!this.client) {
      throw new Error('Private R2 storage is not configured');
    }
    return this.client;
  }

  private requireCredentials(): PrivateR2Credentials {
    if (!this.credentials) {
      throw new Error('Private R2 storage is not configured');
    }
    return this.credentials;
  }

  private readConfig(key: string): string {
    return this.configService.get<string>(key)?.trim() ?? '';
  }

  private async verifyConnection(): Promise<void> {
    if (!this.client || !this.credentials) {
      return;
    }
    try {
      await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.credentials.bucket,
          MaxKeys: 1,
        }),
      );
      this.logger.log({ event: 'private_r2_connected' });
    } catch {
      this.logger.error(
        'Private R2 connection failed; verify the private bucket credentials and object permissions',
      );
    }
  }

  private logObjectEvent(event: string, key: string, version: string): void {
    this.logger.log({
      event,
      objectId: createHash('sha256').update(key).digest('hex').slice(0, 16),
      version,
    });
  }
}

export function presignPrivateR2GetUrl(
  options: PresignPrivateR2GetOptions,
): string {
  const expiresInSeconds = normalizeSignedUrlTtl(options.expiresInSeconds);
  if (!options.accountId || !options.accessKeyId || !options.secretAccessKey) {
    throw new Error('Private R2 signing credentials are incomplete');
  }
  if (!options.bucket || !isSafePrivateObjectKey(options.key)) {
    throw new Error('Private R2 signing target is invalid');
  }

  const now = options.now ?? new Date();
  if (!Number.isFinite(now.getTime())) {
    throw new Error('Private R2 signing time is invalid');
  }

  const host = `${options.accountId}.r2.cloudflarestorage.com`;
  const dateTime = toAmzDate(now);
  const date = dateTime.slice(0, 8);
  const scope = `${date}/auto/s3/aws4_request`;
  const canonicalUri = `/${[options.bucket, ...options.key.split('/')]
    .map(encodeRfc3986)
    .join('/')}`;
  const query = new Map<string, string>([
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', `${options.accessKeyId}/${scope}`],
    ['X-Amz-Date', dateTime],
    ['X-Amz-Expires', String(expiresInSeconds)],
    ['X-Amz-SignedHeaders', 'host'],
  ]);
  const canonicalQuery = canonicalQueryString(query);
  const canonicalRequest = [
    'GET',
    canonicalUri,
    canonicalQuery,
    `host:${host}\n`,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    dateTime,
    scope,
    createHash('sha256').update(canonicalRequest).digest('hex'),
  ].join('\n');
  const dateKey = hmac(`AWS4${options.secretAccessKey}`, date);
  const regionKey = hmac(dateKey, 'auto');
  const serviceKey = hmac(regionKey, 's3');
  const signingKey = hmac(serviceKey, 'aws4_request');
  const signature = createHmac('sha256', signingKey)
    .update(stringToSign)
    .digest('hex');

  return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

export function privateAssetUrlExpiresAt(url: string): Date | null {
  try {
    const parsed = new URL(url);
    const signedAt = parsed.searchParams.get('X-Amz-Date');
    const expires = Number(parsed.searchParams.get('X-Amz-Expires'));
    if (!signedAt || !Number.isInteger(expires) || expires < 1) {
      return null;
    }
    const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(
      signedAt,
    );
    if (!match) {
      return null;
    }
    const [, year, month, day, hour, minute, second] = match;
    const issuedAt = Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    );
    return new Date(issuedAt + expires * 1000);
  } catch {
    return null;
  }
}

function normalizeSignedUrlTtl(value: number | string | undefined): number {
  const parsed = typeof value === 'string' ? Number(value) : value;
  if (
    parsed === undefined ||
    !Number.isInteger(parsed) ||
    parsed < 1 ||
    parsed > MAX_SIGNED_URL_TTL_SECONDS
  ) {
    if (value === undefined || value === '') {
      return DEFAULT_SIGNED_URL_TTL_SECONDS;
    }
    throw new Error(
      `Private asset signed URL TTL must be between 1 and ${MAX_SIGNED_URL_TTL_SECONDS} seconds`,
    );
  }
  return parsed;
}

function resolveR2SecretAccessKey(rawSecret: string): string {
  if (rawSecret.startsWith('cfat_') || rawSecret.startsWith('cfut_')) {
    return createHash('sha256').update(rawSecret).digest('hex');
  }
  return rawSecret;
}

function encodeKeySegment(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 256 || hasControlCharacters(trimmed)) {
    throw new Error(`Invalid private asset ${label}`);
  }
  return encodeURIComponent(trimmed);
}

function sanitizeFilename(filename: string): string {
  const leaf = basename(filename.trim())
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '')
    .slice(0, 160);
  if (!leaf) {
    throw new Error('Invalid private asset filename');
  }
  return leaf;
}

function isSafePrivateObjectKey(key: string): boolean {
  return (
    key.startsWith(`${PRIVATE_ASSET_KEY_ROOT}/`) &&
    !key.startsWith('/') &&
    !key.includes('\\') &&
    !key
      .split('/')
      .some((segment) => !segment || segment === '.' || segment === '..') &&
    !hasControlCharacters(key)
  );
}

function uniqueRefs(refs: readonly PrivateAssetRef[]): PrivateAssetRef[] {
  const byKey = new Map<string, PrivateAssetRef>();
  for (const ref of refs) {
    byKey.set(ref.key, ref);
  }
  return [...byKey.values()];
}

function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function canonicalQueryString(values: Map<string, string>): string {
  return [...values]
    .map(([key, value]) => [encodeRfc3986(key), encodeRfc3986(value)] as const)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
}

function toAmzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function hmac(key: string | Buffer, value: string): Buffer {
  return createHmac('sha256', key).update(value).digest();
}

function hasControlCharacters(value: string): boolean {
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code <= 31 || code === 127) {
      return true;
    }
  }
  return false;
}

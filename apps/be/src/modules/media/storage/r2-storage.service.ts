import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';
import { createReadStream, createWriteStream } from 'fs';
import { stat } from 'fs/promises';
import { extname } from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

/**
 * Sent with every object we store.
 *
 * `immutable` is a strong claim, and it holds here by construction: no key in
 * this system is ever rewritten with different bytes. Uploads and thumbnails are
 * UUID-prefixed (`buildObjectKey` / `buildThumbnailKey`), and the rendered
 * PowerPoint and Google Slides decks carry a hash of the source's version in
 * their prefix — change the deck and the whole path changes. A cached copy can
 * therefore never be stale, only unused.
 *
 * The Cloudflare cache rule on the media domain already overrides both TTLs, so
 * this is not what makes the CDN work. It matters where that rule does not
 * reach: any client fetching the object directly, and the day the rule is
 * edited or removed by someone who does not know it was load-bearing.
 */
const OBJECT_CACHE_CONTROL = 'public, max-age=31536000, immutable';

@Injectable()
export class R2StorageService implements OnModuleInit {
  private readonly logger = new Logger(R2StorageService.name);
  private client: S3Client | null = null;
  private bucket = '';
  private publicUrl = '';

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const accountId = this.configService.get<string>('r2.accountId')?.trim();
    const accessKeyId = this.configService
      .get<string>('r2.accessKeyId')
      ?.trim();
    const rawSecret = this.configService
      .get<string>('r2.secretAccessKey')
      ?.trim();
    this.bucket = this.configService.get<string>('r2.bucket')?.trim() ?? '';
    this.publicUrl =
      this.configService.get<string>('r2.publicUrl')?.trim() ?? '';

    if (!accountId || !accessKeyId || !rawSecret || !this.bucket) {
      this.logger.warn(
        'R2 storage is not fully configured — media uploads will fail until R2 env vars are set',
      );
      return;
    }

    const secretAccessKey = this.resolveS3SecretAccessKey(rawSecret);

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
      // R2 does not support AWS SDK v3.729+ default CRC32 checksums on PutObject.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });

    void this.verifyConnection();
  }

  /**
   * Cloudflare R2 S3 credentials use the token ID as Access Key ID and either
   * the dashboard "Secret Access Key" or SHA-256 of the token value (cfat_/cfut_).
   * @see https://developers.cloudflare.com/r2/api/tokens/
   */
  private resolveS3SecretAccessKey(rawSecret: string): string {
    if (rawSecret.startsWith('cfat_') || rawSecret.startsWith('cfut_')) {
      this.logger.log(
        'R2_SECRET_ACCESS_KEY is a Cloudflare API token — deriving S3 secret via SHA-256',
      );
      return createHash('sha256').update(rawSecret).digest('hex');
    }

    return rawSecret;
  }

  private async verifyConnection(): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          MaxKeys: 1,
        }),
      );
      this.logger.log(`R2 storage connected to bucket "${this.bucket}"`);
    } catch (error) {
      this.logger.error(
        `R2 connection failed for bucket "${this.bucket}". ` +
          'Verify R2_ACCOUNT_ID, R2_BUCKET, and that API token credentials were created under R2 → Manage R2 API Tokens with Object Read & Write permission.',
        error,
      );
    }
  }

  isConfigured(): boolean {
    return this.client !== null && Boolean(this.bucket);
  }

  getPublicUrl(key: string): string | undefined {
    if (!this.publicUrl) {
      return undefined;
    }

    return `${this.publicUrl}/${key}`;
  }

  buildObjectKey(
    organizationId: string,
    userId: string,
    originalFilename: string,
    suffix?: string,
  ): string {
    const ext = extname(originalFilename).toLowerCase();
    const baseName = this.sanitizeFilename(originalFilename);
    const uuid = randomUUID();
    const filePart = suffix
      ? `${uuid}-${baseName}-${suffix}${ext}`
      : `${uuid}-${baseName}${ext}`;

    return `${organizationId}/${userId}/${filePart}`;
  }

  buildThumbnailKey(
    organizationId: string,
    userId: string,
    originalFilename: string,
    variant: 'small' | 'large',
  ): string {
    const ext = '.webp';
    const baseName = this.sanitizeFilename(originalFilename);
    const uuid = randomUUID();

    return `${organizationId}/${userId}/thumbnails/${uuid}-${baseName}-${variant}${ext}`;
  }

  async uploadObject(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    if (!this.client) {
      throw new Error('R2 storage is not configured');
    }

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: OBJECT_CACHE_CONTROL,
      }),
    );
  }

  async getObject(
    key: string,
  ): Promise<{ body: Buffer; contentType?: string }> {
    if (!this.client) {
      throw new Error('R2 storage is not configured');
    }

    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );

    if (!response.Body) {
      throw new Error('Empty object body');
    }

    return {
      body: Buffer.from(await response.Body.transformToByteArray()),
      contentType: response.ContentType,
    };
  }

  /**
   * Streams an object from R2 without buffering it fully in memory. Preferred
   * for downloads; the caller is responsible for piping the stream to the
   * response and handling stream errors.
   */
  async getObjectStream(key: string): Promise<{
    stream: Readable;
    contentType?: string;
    contentLength?: number;
  }> {
    if (!this.client) {
      throw new Error('R2 storage is not configured');
    }

    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );

    if (!response.Body) {
      throw new Error('Empty object body');
    }

    return {
      stream: response.Body as Readable,
      contentType: response.ContentType,
      contentLength: response.ContentLength,
    };
  }

  /**
   * Streams an object straight to a file on disk, never holding it in the heap.
   * For anything that is then handed to an external tool (ffmpeg), this is what
   * `getObject` should have been: a 34MB clip buffered into memory is 34MB the
   * encoder next to it no longer has.
   */
  async downloadToFile(
    key: string,
    destinationPath: string,
  ): Promise<{ contentType?: string }> {
    const { stream, contentType } = await this.getObjectStream(key);
    await pipeline(stream, createWriteStream(destinationPath));

    return contentType !== undefined ? { contentType } : {};
  }

  /**
   * Uploads a file from disk without reading it into memory. `ContentLength` is
   * taken from the file itself — S3/R2 require an explicit length for a
   * streamed body, and without it the SDK would buffer the stream to measure it,
   * defeating the point.
   */
  async uploadFile(
    key: string,
    sourcePath: string,
    contentType: string,
  ): Promise<{ size: number }> {
    if (!this.client) {
      throw new Error('R2 storage is not configured');
    }

    const { size } = await stat(sourcePath);

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: createReadStream(sourcePath),
        ContentType: contentType,
        ContentLength: size,
        CacheControl: OBJECT_CACHE_CONTROL,
      }),
    );

    return { size };
  }

  async deleteObject(key: string): Promise<void> {
    if (!this.client || !key) {
      return;
    }

    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  async deleteObjects(keys: string[]): Promise<void> {
    const uniqueKeys = [...new Set(keys.filter(Boolean))];

    await Promise.all(uniqueKeys.map((key) => this.deleteObject(key)));
  }

  private sanitizeFilename(filename: string): string {
    const ext = extname(filename);
    const base = filename.slice(0, filename.length - ext.length);

    return (
      base
        .normalize('NFKD')
        .replace(/[^\w.-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 120) || 'file'
    );
  }
}

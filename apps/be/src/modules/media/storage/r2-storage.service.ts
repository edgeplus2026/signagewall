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
import { extname } from 'path';
import { Readable } from 'stream';

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

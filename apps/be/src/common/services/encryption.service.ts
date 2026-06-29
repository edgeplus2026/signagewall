import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** AES-256-GCM: 12-byte IV (recommended); the 16-byte auth tag is implicit. */
const IV_BYTES = 12;
const KEY_BYTES = 32;
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypts/decrypts small secrets (third-party OAuth tokens) for storage at
 * rest with AES-256-GCM. The key comes from `ENCRYPTION_KEY` (a 32-byte key,
 * base64 or hex). When no key is configured the service reports
 * {@link isEnabled} false and refuses to encrypt — callers gate connected-app
 * features on this so tokens are never persisted in the clear.
 *
 * Ciphertext is serialized as `v1.<iv>.<tag>.<data>` (all base64url), so the
 * format is self-describing and future key/format migrations are detectable.
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly key: Buffer | null;

  constructor(configService: ConfigService) {
    this.key = this.loadKey(configService.get<string>('encryptionKey'));
    if (!this.key) {
      this.logger.warn(
        'ENCRYPTION_KEY is not set; connected apps (OAuth token storage) are disabled.',
      );
    }
  }

  /** True when a valid key is configured and encryption can be used. */
  isEnabled(): boolean {
    return this.key !== null;
  }

  /** Encrypt a UTF-8 string to the `v1.<iv>.<tag>.<data>` envelope. */
  encrypt(plaintext: string): string {
    if (!this.key) {
      throw new Error('Encryption is not configured (ENCRYPTION_KEY missing).');
    }
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const data = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return ['v1', b64(iv), b64(tag), b64(data)].join('.');
  }

  /** Decrypt a `v1.<iv>.<tag>.<data>` envelope; throws on tamper/format error. */
  decrypt(envelope: string): string {
    if (!this.key) {
      throw new Error('Encryption is not configured (ENCRYPTION_KEY missing).');
    }
    const parts = envelope.split('.');
    if (parts.length !== 4 || parts[0] !== 'v1') {
      throw new Error('Malformed ciphertext envelope.');
    }
    const iv = unb64(parts[1]);
    const tag = unb64(parts[2]);
    const data = unb64(parts[3]);
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(tag);
    // GCM verifies the tag on `final()`; a tampered ciphertext throws here.
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      'utf8',
    );
  }

  /** Parse the configured key (base64 or hex) into exactly 32 bytes, or null. */
  private loadKey(raw: string | undefined): Buffer | null {
    if (!raw) {
      return null;
    }
    const candidates = [tryDecode(raw, 'base64'), tryDecode(raw, 'hex')].filter(
      (buf): buf is Buffer => buf !== null && buf.length === KEY_BYTES,
    );
    if (candidates.length === 0) {
      this.logger.error(
        'ENCRYPTION_KEY must decode to exactly 32 bytes (base64 or hex).',
      );
      return null;
    }
    return candidates[0];
  }
}

function b64(buf: Buffer): string {
  return buf.toString('base64url');
}

function unb64(value: string): Buffer {
  return Buffer.from(value, 'base64url');
}

function tryDecode(value: string, encoding: 'base64' | 'hex'): Buffer | null {
  try {
    return Buffer.from(value, encoding);
  } catch {
    return null;
  }
}

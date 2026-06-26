import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Unambiguous alphabet for pairing codes: no 0/O, 1/I/L. Codes are displayed on
 * a TV and typed by a human in the CMS, so legibility matters more than density.
 */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const TOKEN_BYTES = 32;

export interface GeneratedToken {
  /** Returned to the device once; never persisted in the clear. */
  token: string;
  /** SHA-256 hex digest persisted on the device document. */
  tokenHash: string;
}

@Injectable()
export class PlayerTokensService {
  constructor(private readonly configService: ConfigService) {}

  /** Generates a high-entropy opaque token plus its storable hash. */
  generateToken(): GeneratedToken {
    const token = crypto.randomBytes(TOKEN_BYTES).toString('base64url');
    return { token, tokenHash: this.hashToken(token) };
  }

  /**
   * Device tokens are high-entropy random strings, so a fast one-way SHA-256 is
   * sufficient (unlike low-entropy passwords, which need bcrypt). Hashing lets us
   * look the device up by `tokenHash` without ever storing the raw token.
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /** A formatted pairing code like `ABC-D29`. */
  generatePairingCode(): string {
    const chars = Array.from(crypto.randomBytes(CODE_LENGTH))
      .map((byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length])
      .join('');
    return `${chars.slice(0, 3)}-${chars.slice(3)}`;
  }

  pairingCodeExpiry(): Date {
    const minutes = this.configService.getOrThrow<number>(
      'player.pairingCodeTtlMinutes',
    );
    return new Date(Date.now() + minutes * 60_000);
  }
}

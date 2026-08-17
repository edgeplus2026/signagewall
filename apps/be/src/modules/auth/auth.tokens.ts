import { createHash, timingSafeEqual } from 'crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface TokenPayload {
  sub: string;
  email: string;
  impersonatorId?: string;
}

export interface GenerateTokensOptions {
  impersonatorId?: string;
}

@Injectable()
export class AuthTokensService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async generateTokens(
    userId: string,
    email: string,
    options?: GenerateTokensOptions,
  ): Promise<AuthTokens> {
    const payload: TokenPayload = { sub: userId, email };

    if (options?.impersonatorId) {
      payload.impersonatorId = options.impersonatorId;
    }

    const accessExpiresIn = this.configService.getOrThrow<string>(
      'jwt.accessExpiresIn',
    ) as JwtSignOptions['expiresIn'];
    const refreshExpiresIn = this.configService.getOrThrow<string>(
      'jwt.refreshExpiresIn',
    ) as JwtSignOptions['expiresIn'];

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
        expiresIn: accessExpiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
        expiresIn: refreshExpiresIn,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * SHA-256, deliberately not bcrypt. bcrypt silently truncates its input at
   * 72 bytes, and every refresh JWT for one user shares its first 72 bytes
   * (fixed header + `{"sub":"<same id>"…`) — so under bcrypt ANY of a user's
   * past refresh tokens compared "valid" against the stored hash of the
   * newest one, and rotation revoked nothing. The token is a high-entropy
   * HMAC-signed JWT, not a password: there is nothing to slow-brute-force,
   * so an unsalted digest is the right primitive.
   *
   * Kept async so callers are agnostic to the primitive.
   */
  hashRefreshToken(refreshToken: string): Promise<string> {
    return Promise.resolve(
      createHash('sha256').update(refreshToken).digest('hex'),
    );
  }

  compareRefreshToken(
    refreshToken: string,
    refreshTokenHash: string,
  ): Promise<boolean> {
    const computed = createHash('sha256').update(refreshToken).digest();
    const stored = Buffer.from(refreshTokenHash, 'hex');
    // Length mismatch covers legacy bcrypt hashes still in the database:
    // they fail closed here, which just sends that session back to login.
    if (stored.length !== computed.length) {
      return Promise.resolve(false);
    }
    return Promise.resolve(timingSafeEqual(computed, stored));
  }

  verifyRefreshToken(refreshToken: string): Promise<TokenPayload> {
    return this.jwtService.verifyAsync(refreshToken, {
      secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
    });
  }
}

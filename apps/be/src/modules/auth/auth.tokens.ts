import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

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

  hashRefreshToken(refreshToken: string): Promise<string> {
    return bcrypt.hash(refreshToken, 10);
  }

  compareRefreshToken(
    refreshToken: string,
    refreshTokenHash: string,
  ): Promise<boolean> {
    return bcrypt.compare(refreshToken, refreshTokenHash);
  }

  verifyRefreshToken(refreshToken: string): Promise<TokenPayload> {
    return this.jwtService.verifyAsync(refreshToken, {
      secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
    });
  }
}

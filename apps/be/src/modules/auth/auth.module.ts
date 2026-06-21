import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { MailModule } from '../mail/mail.module';
import { MembersModule } from '../members/members.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { GoogleAuthController } from './google-auth.controller';
import { AuthService } from './auth.service';
import { AuthTokensService } from './auth.tokens';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({})
export class AuthModule {
  static register(): DynamicModule {
    const googleEnabled = Boolean(
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
    );

    const googleProviders = googleEnabled
      ? [GoogleStrategy, GoogleAuthGuard]
      : [];

    return {
      module: AuthModule,
      global: true,
      imports: [
        UsersModule,
        MailModule,
        MembersModule,
        PassportModule.register({ defaultStrategy: 'jwt-access' }),
        JwtModule.register({}),
        ConfigModule,
      ],
      controllers: [
        AuthController,
        ...(googleEnabled ? [GoogleAuthController] : []),
      ],
      providers: [
        AuthService,
        AuthTokensService,
        JwtStrategy,
        JwtAuthGuard,
        ...googleProviders,
      ],
      exports: [AuthService, AuthTokensService, JwtAuthGuard],
    };
  }
}

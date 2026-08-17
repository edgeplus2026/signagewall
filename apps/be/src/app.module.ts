import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import {
  AcceptLanguageResolver,
  HeaderResolver,
  I18nModule,
} from 'nestjs-i18n';
import * as path from 'path';

import { CommonModule } from './common/common.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { RedisModule } from './common/redis/redis.module';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { HealthModule } from './modules/health/health.module';
import { LegalModule } from './modules/legal/legal.module';
import { MailModule } from './modules/mail/mail.module';
import { AdminModule } from './modules/admin/admin.module';
import { AiContentModule } from './modules/ai-content/ai-content.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AppsModule } from './modules/apps/apps.module';
import { BillingModule } from './modules/billing/billing.module';
import { ConnectionsModule } from './modules/connections/connections.module';
import { CrmModule } from './modules/crm/crm.module';
import { DataDeletionModule } from './modules/data-deletion/data-deletion.module';
import { MembersModule } from './modules/members/members.module';
import { MediaModule } from './modules/media/media.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { PlansModule } from './modules/plans/plans.module';
import { TrialModule } from './modules/plans/trial.module';
import { PlayerModule } from './modules/player/player.module';
import { PlaylistsModule } from './modules/playlists/playlists.module';
import { ScreensModule } from './modules/screens/screens.module';
import { SettingsModule } from './modules/settings/settings.module';
import { StockMediaModule } from './modules/stock-media/stock-media.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: true,
      },
    }),
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.join(__dirname, '/i18n/locales/'),
        watch: process.env.NODE_ENV !== 'production',
      },
      resolvers: [new HeaderResolver(['x-lang']), AcceptLanguageResolver],
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.getOrThrow<number>('throttle.ttlSeconds') * 1000,
            limit: configService.getOrThrow<number>('throttle.limit'),
          },
        ],
      }),
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    // Global: supplies the scheduler lease that keeps periodic jobs from running
    // once per API instance. No-op without Redis.
    RedisModule,
    DatabaseModule,
    CommonModule,
    AnalyticsModule,
    UsersModule,
    MailModule,
    AuthModule.register(),
    SettingsModule,
    OrganizationsModule,
    MembersModule,
    MediaModule,
    StockMediaModule,
    PlaylistsModule,
    ScreensModule,
    AdminModule,
    BillingModule,
    CrmModule,
    AppsModule,
    AiContentModule,
    ConnectionsModule,
    PlayerModule,
    NotificationsModule,
    LegalModule,
    DataDeletionModule,
    PlansModule,
    TrialModule,
    OnboardingModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseTransformInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}

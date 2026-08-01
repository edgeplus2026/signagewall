import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import type { RedisOptions } from 'ioredis';

import { OrgMembershipGuard } from '../../common/guards/org-membership.guard';
import { AppsModule } from '../apps/apps.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { PlaylistsModule } from '../playlists/playlists.module';
import { StockMediaModule } from '../stock-media/stock-media.module';
import {
  AI_CONTENT_JOB_ATTEMPTS,
  AI_CONTENT_QUEUE,
} from './ai-content.constants';
import { AiContentController } from './ai-content.controller';
import { AiContentMaterializer } from './ai-content.materializer';
import { AiContentProcessor } from './ai-content.processor';
import { AiContentRepository } from './ai-content.repository';
import { AiContentService } from './ai-content.service';
import { AI_CONTENT_PROVIDER } from './providers/ai-provider.interface';
import { OpenRouterProvider } from './providers/openrouter.provider';
import {
  AiGeneration,
  AiGenerationSchema,
} from './schemas/ai-generation.schema';

/** Resolve BullMQ's Redis connection from config (REDIS_URL wins over host/port). */
function buildRedisConnection(config: ConfigService): RedisOptions {
  const url = config.get<string>('redis.url')?.trim();
  if (url) {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : 6379,
      /* Managed hosts reached over a provider's private network resolve to AAAA
         records only (Railway's `*.railway.internal` is IPv6-only). ioredis
         defaults its DNS lookup to IPv4, which fails there with ENOTFOUND;
         `family: 0` accepts whichever record the host publishes and leaves
         plain IPv4 hosts, including localhost in development, unchanged. */
      family: 0,
      ...(parsed.username
        ? { username: decodeURIComponent(parsed.username) }
        : {}),
      ...(parsed.password
        ? { password: decodeURIComponent(parsed.password) }
        : {}),
      ...(parsed.protocol === 'rediss:' ? { tls: {} } : {}),
    };
  }

  const password = config.get<string>('redis.password')?.trim();
  return {
    host: config.get<string>('redis.host') ?? 'localhost',
    port: config.get<number>('redis.port') ?? 6379,
    ...(password ? { password } : {}),
    ...(config.get<boolean>('redis.tls') ? { tls: {} } : {}),
  };
}

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: AiGeneration.name, schema: AiGenerationSchema },
    ]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: buildRedisConnection(config),
      }),
    }),
    BullModule.registerQueue({
      name: AI_CONTENT_QUEUE,
      defaultJobOptions: {
        attempts: AI_CONTENT_JOB_ATTEMPTS,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    }),
    OrganizationsModule,
    AppsModule,
    PlaylistsModule,
    StockMediaModule,
  ],
  controllers: [AiContentController],
  providers: [
    AiContentService,
    AiContentRepository,
    AiContentProcessor,
    AiContentMaterializer,
    OrgMembershipGuard,
    { provide: AI_CONTENT_PROVIDER, useClass: OpenRouterProvider },
  ],
})
export class AiContentModule {}

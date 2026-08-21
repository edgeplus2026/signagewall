import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { OrgMembershipGuard } from '../../common/guards/org-membership.guard';
import { buildQueueRedisOptions } from '../../common/redis/redis-connection';
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
        connection: buildQueueRedisOptions(config),
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

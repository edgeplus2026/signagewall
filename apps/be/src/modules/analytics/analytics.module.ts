import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { SuperAdminGuard } from '../admin/guards/super-admin.guard';
import { UsersModule } from '../users/users.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsRepository } from './analytics.repository';
import { AnalyticsService } from './analytics.service';
import { Ga4MeasurementService } from './ga4-measurement.service';
import { FunnelEvent, FunnelEventSchema } from './schemas/funnel-event.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FunnelEvent.name, schema: FunnelEventSchema },
    ]),
    UsersModule,
  ],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    AnalyticsRepository,
    Ga4MeasurementService,
    SuperAdminGuard,
  ],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

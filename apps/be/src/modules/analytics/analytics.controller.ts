import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';
import { SuperAdminGuard } from '../admin/guards/super-admin.guard';
import { AnalyticsService } from './analytics.service';
import { FunnelOverviewQueryDto } from './dto/funnel-overview-query.dto';
import { RecordFunnelEventDto } from './dto/record-funnel-event.dto';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  /** Public but globally rate-limited; only a fixed event/property allowlist is stored. */
  @Public()
  @Post('events')
  async record(@Body() dto: RecordFunnelEventDto) {
    await this.analytics.record({
      eventName: dto.eventName,
      anonymousId: dto.anonymousId,
      acquisitionToken: dto.acquisitionToken,
      leadType: dto.leadType,
      properties: dto.properties,
      analyticsConsent: dto.analyticsConsent,
      source: 'client',
    });
    return { accepted: true };
  }

  @Get('admin/funnel')
  @UseGuards(SuperAdminGuard)
  overview(@Query() query: FunnelOverviewQueryDto) {
    return this.analytics.getOverview(query);
  }
}

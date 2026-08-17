import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';

import { OrgMembershipGuard } from '../../common/guards/org-membership.guard';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AppsModule } from '../apps/apps.module';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { MediaModule } from '../media/media.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { PlaylistsModule } from '../playlists/playlists.module';
import { ScreensModule } from '../screens/screens.module';
import { CmsGateway } from './cms.gateway';
import { DevicePairingController } from './device-pairing.controller';
import { DevicesRepository } from './devices.repository';
import { PlaybackController } from './playback.controller';
import { PlaybackVerifyController } from './playback-verify.controller';
import { MailModule } from '../mail/mail.module';
import { PlaybackPdfService } from './playback-pdf.service';
import { ReportScheduleService } from './report-schedule.service';
import { PlaybackReportService } from './playback-report.service';
import { PlaybackRepository } from './playback.repository';
import { PlaybackService } from './playback.service';
import { PlayerContentService } from './player-content.service';
import { PlayerController } from './player.controller';
import { PlayerGateway } from './player.gateway';
import { PlayerService } from './player.service';
import { PlayerTokenGuard } from './guards/player-token.guard';
import { PlayerTokensService } from './player-tokens.service';
import { Device, DeviceSchema } from './schemas/device.schema';
import {
  PlaybackMonth,
  PlaybackMonthSchema,
} from './schemas/playback-month.schema';
import {
  PlaybackRecord,
  PlaybackRecordSchema,
} from './schemas/playback-record.schema';
import {
  ReportSchedule,
  ReportScheduleSchema,
} from './schemas/report-schedule.schema';

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({}),
    MongooseModule.forFeature([
      { name: Device.name, schema: DeviceSchema },
      { name: PlaybackRecord.name, schema: PlaybackRecordSchema },
      { name: PlaybackMonth.name, schema: PlaybackMonthSchema },
      { name: ReportSchedule.name, schema: ReportScheduleSchema },
    ]),
    AnalyticsModule,
    CampaignsModule,
    MailModule,
    OrganizationsModule,
    ScreensModule,
    PlaylistsModule,
    MediaModule,
    AppsModule,
  ],
  controllers: [
    PlayerController,
    DevicePairingController,
    PlaybackController,
    PlaybackVerifyController,
  ],
  providers: [
    PlayerService,
    PlayerContentService,
    PlayerTokensService,
    DevicesRepository,
    PlaybackRepository,
    PlaybackService,
    PlaybackReportService,
    PlaybackPdfService,
    ReportScheduleService,
    PlayerGateway,
    CmsGateway,
    PlayerTokenGuard,
    OrgMembershipGuard,
  ],
})
export class PlayerModule {}

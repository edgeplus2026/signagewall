import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';

import { OrgMembershipGuard } from '../../common/guards/org-membership.guard';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AppsModule } from '../apps/apps.module';
import { MailModule } from '../mail/mail.module';
import { MediaModule } from '../media/media.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { PlaylistsModule } from '../playlists/playlists.module';
import { ScreensModule } from '../screens/screens.module';
import { UsersModule } from '../users/users.module';
import { CmsGateway } from './cms.gateway';
import { DeviceOfflineAlertScheduler } from './device-offline-alert.scheduler';
import { DeviceOfflineAlertService } from './device-offline-alert.service';
import { DevicePairingController } from './device-pairing.controller';
import { DevicesRepository } from './devices.repository';
import { PlayerMaintenanceGuard } from './guards/player-maintenance.guard';
import { PlayerTokenGuard } from './guards/player-token.guard';
import { PlaybackPdfService } from './playback-pdf.service';
import { PlaybackReportService } from './playback-report.service';
import { PlaybackVerifyController } from './playback-verify.controller';
import { PlaybackController } from './playback.controller';
import { PlaybackRepository } from './playback.repository';
import { PlaybackService } from './playback.service';
import { PlayerContentService } from './player-content.service';
import { PlayerController } from './player.controller';
import { PlayerGateway } from './player.gateway';
import { PlayerService } from './player.service';
import { PlayerTokensService } from './player-tokens.service';
import { PrivateAssetsHydrationService } from './private-assets-hydration.service';
import { ReportScheduleService } from './report-schedule.service';
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
    MailModule,
    OrganizationsModule,
    ScreensModule,
    PlaylistsModule,
    MediaModule,
    AppsModule,
    UsersModule,
  ],
  controllers: [
    PlayerController,
    DevicePairingController,
    PlaybackController,
    PlaybackVerifyController,
  ],
  providers: [
    PlayerMaintenanceGuard,
    PlayerService,
    PlayerContentService,
    PrivateAssetsHydrationService,
    PlayerTokensService,
    DevicesRepository,
    DeviceOfflineAlertService,
    DeviceOfflineAlertScheduler,
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

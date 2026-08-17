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
import { PlayerContentService } from './player-content.service';
import { PrivateAssetsHydrationService } from './private-assets-hydration.service';
import { PlayerController } from './player.controller';
import { PlayerGateway } from './player.gateway';
import { PlayerService } from './player.service';
import { PlayerTokenGuard } from './guards/player-token.guard';
import { PlayerTokensService } from './player-tokens.service';
import { Device, DeviceSchema } from './schemas/device.schema';

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({}),
    MongooseModule.forFeature([{ name: Device.name, schema: DeviceSchema }]),
    AnalyticsModule,
    OrganizationsModule,
    ScreensModule,
    PlaylistsModule,
    MediaModule,
    AppsModule,
    MailModule,
    UsersModule,
  ],
  controllers: [PlayerController, DevicePairingController],
  providers: [
    PlayerService,
    PlayerContentService,
    PrivateAssetsHydrationService,
    PlayerTokensService,
    DevicesRepository,
    DeviceOfflineAlertService,
    DeviceOfflineAlertScheduler,
    PlayerGateway,
    CmsGateway,
    PlayerTokenGuard,
    OrgMembershipGuard,
  ],
})
export class PlayerModule {}

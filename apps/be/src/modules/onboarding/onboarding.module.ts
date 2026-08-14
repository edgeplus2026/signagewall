import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { OrgMembershipGuard } from '../../common/guards/org-membership.guard';
import { MediaItem, MediaItemSchema } from '../media/schemas/media-item.schema';
import { OrganizationsModule } from '../organizations/organizations.module';
import { Playlist, PlaylistSchema } from '../playlists/schemas/playlist.schema';
import { Device, DeviceSchema } from '../player/schemas/device.schema';
import { Screen, ScreenSchema } from '../screens/schemas/screen.schema';
import { OnboardingController } from './onboarding.controller';
import { OnboardingRepository } from './onboarding.repository';
import { OnboardingService } from './onboarding.service';
import {
  OnboardingProgress,
  OnboardingProgressSchema,
} from './schemas/onboarding-progress.schema';

/**
 * First-run checklist. Registers the content models directly instead of
 * importing MediaModule/ScreensModule/PlayerModule: it only ever asks each
 * collection "is there one?", and depending on four feature services to answer
 * that would drag their whole dependency graphs (storage, gateways, mail) into
 * a read that must stay cheap.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OnboardingProgress.name, schema: OnboardingProgressSchema },
      { name: MediaItem.name, schema: MediaItemSchema },
      { name: Playlist.name, schema: PlaylistSchema },
      { name: Screen.name, schema: ScreenSchema },
      { name: Device.name, schema: DeviceSchema },
    ]),
    // Only for OrgMembershipGuard, which resolves the caller's membership.
    OrganizationsModule,
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService, OnboardingRepository, OrgMembershipGuard],
})
export class OnboardingModule {}

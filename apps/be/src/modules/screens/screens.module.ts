import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { OrgMembershipGuard } from '../../common/guards/org-membership.guard';
import { MediaModule } from '../media/media.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { PlaylistsModule } from '../playlists/playlists.module';
import { AvailabilityEvaluator } from './availability/availability.evaluator';
import { ScreensController } from './screens.controller';
import { ScreensRepository } from './screens.repository';
import { ScreensService } from './screens.service';
import { Screen, ScreenSchema } from './schemas/screen.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: Screen.name, schema: ScreenSchema }]),
    OrganizationsModule,
    forwardRef(() => MediaModule),
    forwardRef(() => PlaylistsModule),
  ],
  controllers: [ScreensController],
  providers: [
    ScreensService,
    ScreensRepository,
    AvailabilityEvaluator,
    OrgMembershipGuard,
  ],
  exports: [ScreensService, ScreensRepository],
})
export class ScreensModule {}

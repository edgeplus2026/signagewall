import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { OrgMembershipGuard } from '../../common/guards/org-membership.guard';
import { MediaModule } from '../media/media.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ScreensModule } from '../screens/screens.module';
import { SchedulesModule } from '../schedules/schedules.module';
import { PlaylistsController } from './playlists.controller';
import { PlaylistsRepository } from './playlists.repository';
import { PlaylistsService } from './playlists.service';
import { Playlist, PlaylistSchema } from './schemas/playlist.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Playlist.name, schema: PlaylistSchema },
    ]),
    OrganizationsModule,
    forwardRef(() => MediaModule),
    forwardRef(() => ScreensModule),
    forwardRef(() => SchedulesModule),
  ],
  controllers: [PlaylistsController],
  providers: [PlaylistsService, PlaylistsRepository, OrgMembershipGuard],
  exports: [PlaylistsService, PlaylistsRepository],
})
export class PlaylistsModule {}

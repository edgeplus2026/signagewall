import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { OrgMembershipGuard } from '../../common/guards/org-membership.guard';
import { OrganizationsModule } from '../organizations/organizations.module';
import { PlaylistsModule } from '../playlists/playlists.module';
import { ScreensModule } from '../screens/screens.module';
import { CloudImportService } from './cloud-import.service';
import { CloudMediaFetcher } from './cloud-media.fetcher';
import { MediaProcessingScheduler } from './media-processing.scheduler';
import { MediaController } from './media.controller';
import { MediaRepository } from './media.repository';
import { MediaService } from './media.service';
import { MediaItem, MediaItemSchema } from './schemas/media-item.schema';
import { MediaThumbnailService } from './storage/media-thumbnail.service';
import { MediaVideoService } from './storage/media-video.service';
import { AssetMirrorService } from './storage/asset-mirror.service';
import { PptxRenderService } from './storage/pptx-render.service';
import { PrivateR2StorageService } from './storage/private-r2-storage.service';
import { R2StorageService } from './storage/r2-storage.service';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: MediaItem.name, schema: MediaItemSchema },
    ]),
    OrganizationsModule,
    forwardRef(() => PlaylistsModule),
    forwardRef(() => ScreensModule),
  ],
  controllers: [MediaController],
  providers: [
    MediaService,
    MediaRepository,
    R2StorageService,
    PrivateR2StorageService,
    MediaThumbnailService,
    MediaVideoService,
    PptxRenderService,
    AssetMirrorService,
    MediaProcessingScheduler,
    CloudImportService,
    CloudMediaFetcher,
    OrgMembershipGuard,
  ],
  exports: [MediaService, MediaRepository, PrivateR2StorageService],
})
export class MediaModule {}

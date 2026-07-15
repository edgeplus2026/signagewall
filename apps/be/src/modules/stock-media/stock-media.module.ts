import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { OrgMembershipGuard } from '../../common/guards/org-membership.guard';
import { MediaModule } from '../media/media.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ContentModerationService } from './content-moderation.service';
import { PexelsProvider } from './providers/pexels.provider';
import { STOCK_MEDIA_PROVIDER } from './providers/stock-media-provider.interface';
import { StockMediaController } from './stock-media.controller';
import { StockMediaService } from './stock-media.service';

@Module({
  imports: [ConfigModule, OrganizationsModule, MediaModule],
  controllers: [StockMediaController],
  providers: [
    StockMediaService,
    ContentModerationService,
    OrgMembershipGuard,
    // Bind the active provider here. Swap PexelsProvider for another
    // implementation (or choose dynamically) without touching the service.
    { provide: STOCK_MEDIA_PROVIDER, useClass: PexelsProvider },
  ],
  // Exported so other modules (e.g. AI content generation) can reuse stock
  // search without re-implementing a provider client.
  exports: [STOCK_MEDIA_PROVIDER],
})
export class StockMediaModule {}

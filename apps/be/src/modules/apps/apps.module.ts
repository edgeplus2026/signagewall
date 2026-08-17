import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { OrgMembershipGuard } from '../../common/guards/org-membership.guard';
import { ConnectionsModule } from '../connections/connections.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { MediaModule } from '../media/media.module';
import { PrivateR2StorageService } from '../media/storage/private-r2-storage.service';
import { PlaylistsModule } from '../playlists/playlists.module';
import { ScreensModule } from '../screens/screens.module';
import { UsersModule } from '../users/users.module';
import { AppDataCacheRepository } from './app-data-cache.repository';
import { AppDataScheduler } from './app-data.scheduler';
import { AppDataService } from './app-data.service';
import { AppInstancesController } from './app-instances.controller';
import { AppInstancesRepository } from './app-instances.repository';
import { AppInstancesService } from './app-instances.service';
import { AppsAdminController } from './apps-admin.controller';
import { AppsController } from './apps.controller';
import { AppsRepository } from './apps.repository';
import { AppsService } from './apps.service';
import { OrgAppsRepository } from './org-apps.repository';
import { PrivateAssetsPreviewService } from './private-assets-preview.service';
import { registerPowerBiPrivateStorage } from './connectors/powerbi-secure/storage.registry';
import { WebhooksController } from './webhooks.controller';
import { SuperAdminGuard } from '../admin/guards/super-admin.guard';
import { App, AppSchema } from './schemas/app.schema';
import {
  AppDataCache,
  AppDataCacheSchema,
} from './schemas/app-data-cache.schema';
import { AppInstance, AppInstanceSchema } from './schemas/app-instance.schema';
import { OrgApp, OrgAppSchema } from './schemas/org-app.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: App.name, schema: AppSchema },
      { name: AppInstance.name, schema: AppInstanceSchema },
      { name: OrgApp.name, schema: OrgAppSchema },
      { name: AppDataCache.name, schema: AppDataCacheSchema },
    ]),
    UsersModule,
    OrganizationsModule,
    forwardRef(() => MediaModule),
    forwardRef(() => ConnectionsModule),
    // Cascade: deleting an app instance purges its references from playlists and
    // screens. forwardRef because both modules import AppsModule.
    forwardRef(() => PlaylistsModule),
    forwardRef(() => ScreensModule),
  ],
  controllers: [
    AppsController,
    AppsAdminController,
    AppInstancesController,
    WebhooksController,
  ],
  providers: [
    AppsService,
    AppsRepository,
    AppInstancesService,
    AppInstancesRepository,
    OrgAppsRepository,
    AppDataCacheRepository,
    AppDataService,
    AppDataScheduler,
    PrivateAssetsPreviewService,
    SuperAdminGuard,
    OrgMembershipGuard,
  ],
  exports: [
    AppsService,
    AppsRepository,
    AppInstancesService,
    AppInstancesRepository,
    AppDataCacheRepository,
    AppDataService,
  ],
})
export class AppsModule {
  constructor(private readonly privateStorage: PrivateR2StorageService) {
    registerPowerBiPrivateStorage(privateStorage);
  }
}

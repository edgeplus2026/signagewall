import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { OrgMembershipGuard } from '../../common/guards/org-membership.guard';
import { ConnectionsModule } from '../connections/connections.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { UsersModule } from '../users/users.module';
import { AppCategoriesAdminController } from './app-categories-admin.controller';
import { AppCategoriesRepository } from './app-categories.repository';
import { AppCategoriesService } from './app-categories.service';
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
import { SuperAdminGuard } from '../admin/guards/super-admin.guard';
import { App, AppSchema } from './schemas/app.schema';
import { AppCategory, AppCategorySchema } from './schemas/app-category.schema';
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
      { name: AppCategory.name, schema: AppCategorySchema },
      { name: AppInstance.name, schema: AppInstanceSchema },
      { name: OrgApp.name, schema: OrgAppSchema },
      { name: AppDataCache.name, schema: AppDataCacheSchema },
    ]),
    UsersModule,
    OrganizationsModule,
    forwardRef(() => ConnectionsModule),
  ],
  controllers: [
    AppsController,
    AppsAdminController,
    AppCategoriesAdminController,
    AppInstancesController,
  ],
  providers: [
    AppsService,
    AppsRepository,
    AppCategoriesService,
    AppCategoriesRepository,
    AppInstancesService,
    AppInstancesRepository,
    OrgAppsRepository,
    AppDataCacheRepository,
    AppDataService,
    AppDataScheduler,
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
export class AppsModule {}

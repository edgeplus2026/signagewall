import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { OrgMembershipGuard } from '../../common/guards/org-membership.guard';
import { OrganizationsModule } from '../organizations/organizations.module';
import { UsersModule } from '../users/users.module';
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
import { AppInstance, AppInstanceSchema } from './schemas/app-instance.schema';
import { OrgApp, OrgAppSchema } from './schemas/org-app.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: App.name, schema: AppSchema },
      { name: AppInstance.name, schema: AppInstanceSchema },
      { name: OrgApp.name, schema: OrgAppSchema },
    ]),
    UsersModule,
    OrganizationsModule,
  ],
  controllers: [AppsController, AppsAdminController, AppInstancesController],
  providers: [
    AppsService,
    AppsRepository,
    AppInstancesService,
    AppInstancesRepository,
    OrgAppsRepository,
    SuperAdminGuard,
    OrgMembershipGuard,
  ],
  exports: [
    AppsService,
    AppsRepository,
    AppInstancesService,
    AppInstancesRepository,
  ],
})
export class AppsModule {}

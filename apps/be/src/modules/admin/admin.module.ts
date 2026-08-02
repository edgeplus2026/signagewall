import { Module } from '@nestjs/common';

import { DataDeletionModule } from '../data-deletion/data-deletion.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { PlansModule } from '../plans/plans.module';
import { UsersModule } from '../users/users.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SuperAdminGuard } from './guards/super-admin.guard';

@Module({
  imports: [UsersModule, OrganizationsModule, DataDeletionModule, PlansModule],
  controllers: [AdminController],
  providers: [AdminService, SuperAdminGuard],
})
export class AdminModule {}

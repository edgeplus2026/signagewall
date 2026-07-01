import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';

import { OrgMembershipGuard } from '../../common/guards/org-membership.guard';
import { AppsModule } from '../apps/apps.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ConnectionsController } from './connections.controller';
import { ConnectionsRepository } from './connections.repository';
import { ConnectionsService } from './connections.service';
import {
  AppConnection,
  AppConnectionSchema,
} from './schemas/app-connection.schema';

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({}),
    MongooseModule.forFeature([
      { name: AppConnection.name, schema: AppConnectionSchema },
    ]),
    OrganizationsModule,
    // forwardRef: AppsModule imports ConnectionsModule (scheduler resolves
    // connections).
    forwardRef(() => AppsModule),
  ],
  controllers: [ConnectionsController],
  providers: [ConnectionsService, ConnectionsRepository, OrgMembershipGuard],
  exports: [ConnectionsService],
})
export class ConnectionsModule {}

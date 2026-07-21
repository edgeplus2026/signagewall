import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';

import { OrgMembershipGuard } from '../../common/guards/org-membership.guard';
import { AppsModule } from '../apps/apps.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ConnectionRefreshScheduler } from './connection-refresh.scheduler';
import { ConnectionsController } from './connections.controller';
import { ConnectionsRepository } from './connections.repository';
import { ConnectionsService } from './connections.service';
import {
  AppConnection,
  AppConnectionSchema,
} from './schemas/app-connection.schema';
import {
  GraphSubscription,
  GraphSubscriptionSchema,
} from './schemas/graph-subscription.schema';
import { GraphSubscriptionScheduler } from './webhooks/graph-subscription.scheduler';
import { GraphSubscriptionsRepository } from './webhooks/graph-subscriptions.repository';
import { GraphWebhookController } from './webhooks/graph-webhook.controller';
import { GraphWebhookService } from './webhooks/graph-webhook.service';

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({}),
    MongooseModule.forFeature([
      { name: AppConnection.name, schema: AppConnectionSchema },
      { name: GraphSubscription.name, schema: GraphSubscriptionSchema },
    ]),
    OrganizationsModule,
    // forwardRef: AppsModule imports ConnectionsModule (scheduler resolves
    // connections), and the webhook here calls back into AppDataService.
    forwardRef(() => AppsModule),
  ],
  controllers: [ConnectionsController, GraphWebhookController],
  providers: [
    ConnectionsService,
    ConnectionsRepository,
    GraphSubscriptionsRepository,
    GraphWebhookService,
    GraphSubscriptionScheduler,
    ConnectionRefreshScheduler,
    OrgMembershipGuard,
  ],
  exports: [ConnectionsService, GraphWebhookService],
})
export class ConnectionsModule {}

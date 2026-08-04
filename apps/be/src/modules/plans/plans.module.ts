import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { MailModule } from '../mail/mail.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import {
  OrganizationMembership,
  OrganizationMembershipSchema,
} from '../organizations/schemas/organization-membership.schema';
import {
  Organization,
  OrganizationSchema,
} from '../organizations/schemas/organization.schema';
import { Screen, ScreenSchema } from '../screens/schemas/screen.schema';
import { UsersModule } from '../users/users.module';
import { PlansController } from './plans.controller';
import { PlansRepository } from './plans.repository';
import { PlansService } from './plans.service';
import {
  UpgradeRequest,
  UpgradeRequestSchema,
} from './schemas/upgrade-request.schema';

/**
 * Plan limits: who may create another screen or another organization.
 *
 * Registers the organization, membership and screen models directly rather than
 * importing ScreensModule/OrganizationsModule — both of those import *this* one
 * to gate creation, so going through their services would be circular. For the
 * same reason the trial sweep (which needs the deletion cascade) lives in
 * {@link TrialModule}, one level up, instead of here.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UpgradeRequest.name, schema: UpgradeRequestSchema },
      { name: Organization.name, schema: OrganizationSchema },
      {
        name: OrganizationMembership.name,
        schema: OrganizationMembershipSchema,
      },
      { name: Screen.name, schema: ScreenSchema },
    ]),
    AnalyticsModule,
    UsersModule,
    MailModule,
  ],
  controllers: [PlansController],
  providers: [PlansService, PlansRepository],
  exports: [PlansService, PlansRepository],
})
export class PlansModule {}

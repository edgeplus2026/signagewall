import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { OrgMembershipGuard } from '../../common/guards/org-membership.guard';
import {
  OrganizationInvitation,
  OrganizationInvitationSchema,
} from '../members/schemas/organization-invitation.schema';
import { PlansModule } from '../plans/plans.module';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsRepository } from './organizations.repository';
import { OrganizationsService } from './organizations.service';
import {
  OrganizationMembership,
  OrganizationMembershipSchema,
} from './schemas/organization-membership.schema';
import {
  Organization,
  OrganizationSchema,
} from './schemas/organization.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Organization.name, schema: OrganizationSchema },
      {
        name: OrganizationMembership.name,
        schema: OrganizationMembershipSchema,
      },
      {
        name: OrganizationInvitation.name,
        schema: OrganizationInvitationSchema,
      },
    ]),
    PlansModule,
  ],
  controllers: [OrganizationsController],
  providers: [
    OrganizationsRepository,
    OrganizationsService,
    OrgMembershipGuard,
  ],
  exports: [OrganizationsService, OrganizationsRepository],
})
export class OrganizationsModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { OrgMembershipGuard } from '../../common/guards/org-membership.guard';
import { MailModule } from '../mail/mail.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { UsersModule } from '../users/users.module';
import { InvitationsController } from './invitations.controller';
import { MembersController } from './members.controller';
import { MembersRepository } from './members.repository';
import { MembersService } from './members.service';
import {
  OrganizationInvitation,
  OrganizationInvitationSchema,
} from './schemas/organization-invitation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: OrganizationInvitation.name,
        schema: OrganizationInvitationSchema,
      },
    ]),
    OrganizationsModule,
    UsersModule,
    MailModule,
  ],
  controllers: [MembersController, InvitationsController],
  providers: [MembersRepository, MembersService, OrgMembershipGuard],
  exports: [MembersService],
})
export class MembersModule {}

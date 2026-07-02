import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { OrgMembershipGuard } from '../../common/guards/org-membership.guard';
import {
  AppConnection,
  AppConnectionSchema,
} from '../connections/schemas/app-connection.schema';
import {
  AppInstance,
  AppInstanceSchema,
} from '../apps/schemas/app-instance.schema';
import { OrgApp, OrgAppSchema } from '../apps/schemas/org-app.schema';
import { Device, DeviceSchema } from '../player/schemas/device.schema';
import { LegalModule } from '../legal/legal.module';
import { MediaModule } from '../media/media.module';
import {
  OrganizationInvitation,
  OrganizationInvitationSchema,
} from '../members/schemas/organization-invitation.schema';
import {
  OrganizationMembership,
  OrganizationMembershipSchema,
} from '../organizations/schemas/organization-membership.schema';
import {
  Organization,
  OrganizationSchema,
} from '../organizations/schemas/organization.schema';
import { OrganizationsModule } from '../organizations/organizations.module';
import { Playlist, PlaylistSchema } from '../playlists/schemas/playlist.schema';
import { Screen, ScreenSchema } from '../screens/schemas/screen.schema';
import { UsersModule } from '../users/users.module';
import { DataDeletionController } from './data-deletion.controller';
import { DataDeletionService } from './data-deletion.service';
import {
  PendingDeletion,
  PendingDeletionSchema,
} from './schemas/pending-deletion.schema';

/**
 * GDPR erasure orchestrator. Registers every org-scoped model it must cascade so
 * it stays decoupled from the feature modules (no circular deps) — it only
 * *reuses* MediaService (R2 purge) and UsersRepository (anonymize). SettingsModule
 * and OrganizationsModule import this one-way to enqueue deletions.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PendingDeletion.name, schema: PendingDeletionSchema },
      { name: Organization.name, schema: OrganizationSchema },
      { name: OrganizationMembership.name, schema: OrganizationMembershipSchema },
      { name: OrganizationInvitation.name, schema: OrganizationInvitationSchema },
      { name: Screen.name, schema: ScreenSchema },
      { name: Device.name, schema: DeviceSchema },
      { name: Playlist.name, schema: PlaylistSchema },
      { name: AppInstance.name, schema: AppInstanceSchema },
      { name: OrgApp.name, schema: OrgAppSchema },
      { name: AppConnection.name, schema: AppConnectionSchema },
    ]),
    MediaModule,
    UsersModule,
    OrganizationsModule,
    LegalModule,
  ],
  controllers: [DataDeletionController],
  providers: [DataDeletionService, OrgMembershipGuard],
  exports: [DataDeletionService],
})
export class DataDeletionModule {}

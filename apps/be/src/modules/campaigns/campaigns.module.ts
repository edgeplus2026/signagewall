import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { OrgMembershipGuard } from '../../common/guards/org-membership.guard';
import { OrganizationsModule } from '../organizations/organizations.module';
import { CampaignsController } from './campaigns.controller';
import { CampaignsRepository } from './campaigns.repository';
import { Campaign, CampaignSchema } from './schemas/campaign.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Campaign.name, schema: CampaignSchema },
    ]),
    OrganizationsModule,
  ],
  controllers: [CampaignsController],
  providers: [CampaignsRepository, OrgMembershipGuard],
  exports: [CampaignsRepository],
})
export class CampaignsModule {}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { RequiredOrganizationId } from '../../common/decorators/current-organization.decorator';
import { RequireOrgRole } from '../../common/decorators/org-roles.decorator';
import { BusinessException } from '../../common/exceptions/business.exception';
import { OrgMembershipGuard } from '../../common/guards/org-membership.guard';
import {
  ApiCommonErrorResponses,
  ApiOrgScoped,
  ApiSuccessNullResponse,
  ApiSuccessResponse,
} from '../../common/swagger';
import { CampaignsRepository } from './campaigns.repository';
import {
  CampaignMembershipDto,
  CreateCampaignDto,
  UpdateCampaignDto,
} from './dto/campaign.dto';
import type { CampaignDocument } from './schemas/campaign.schema';

/**
 * Campaigns exist so proof of play can be read the way it is sold: one line per
 * thing somebody bought, not one line per file that happened to carry it.
 */
@ApiTags('campaigns')
@ApiOrgScoped()
@ApiCommonErrorResponses()
@Controller('campaigns')
@UseGuards(OrgMembershipGuard)
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsRepository) {}

  @Get()
  @RequireOrgRole()
  @ApiSuccessResponse(Object, { isArray: true })
  async list(@RequiredOrganizationId() organizationId: string) {
    const campaigns = await this.campaigns.findAll(organizationId);
    return campaigns.map(toDto);
  }

  @Post()
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  async create(
    @RequiredOrganizationId() organizationId: string,
    @Body() dto: CreateCampaignDto,
  ) {
    try {
      const created = await this.campaigns.create(organizationId, dto);
      return toDto(created);
    } catch (error) {
      // One name per organization is enforced by an index, so a repeat arrives
      // as a driver error. Left unhandled it reaches the operator as a 500 for
      // what is really "you already have one of those".
      if (isDuplicateKey(error)) {
        throw BusinessException.conflict('A campaign with that name exists');
      }
      throw error;
    }
  }

  @Patch(':id')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  async update(
    @RequiredOrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    const updated = await this.campaigns.update(organizationId, id, dto);
    if (!updated) {
      throw BusinessException.notFound('Campaign not found');
    }
    return toDto(updated);
  }

  /**
   * Assigns or unassigns one item — called straight from the report table,
   * which is the only place an operator ever knows an item needs a campaign.
   */
  @Patch(':id/content')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  async setMembership(
    @RequiredOrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() dto: CampaignMembershipDto,
  ) {
    const updated = await this.campaigns.setMembership(
      organizationId,
      id,
      dto.contentId,
      dto.member,
    );
    if (!updated) {
      throw BusinessException.notFound('Campaign not found');
    }
    return toDto(updated);
  }

  @Delete(':id')
  @RequireOrgRole()
  @ApiSuccessNullResponse()
  async remove(
    @RequiredOrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    const deleted = await this.campaigns.delete(organizationId, id);
    if (!deleted) {
      throw BusinessException.notFound('Campaign not found');
    }
    // Deleting a campaign never touches playback: the rows are evidence of what
    // a screen did, and regrouping them is not permission to erase them.
    return null;
  }
}

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: number }).code === 11_000
  );
}

function toDto(campaign: CampaignDocument) {
  return {
    id: campaign._id.toString(),
    name: campaign.name,
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    contentIds: campaign.contentIds,
  };
}

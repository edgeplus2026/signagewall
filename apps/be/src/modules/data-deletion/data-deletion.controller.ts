import { Controller, Delete, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireOrgRole } from '../../common/decorators/org-roles.decorator';
import {
  ApiBearerAuthRequired,
  ApiCommonErrorResponses,
} from '../../common/swagger';
import { OrgMembershipGuard } from '../../common/guards/org-membership.guard';
import type { RequestUser } from '../../common/interfaces/request-user.interface';
import { OrganizationsService } from '../organizations/organizations.service';
import { OrganizationRole } from '../organizations/schemas/organization-membership.schema';
import { DataDeletionService } from './data-deletion.service';

/**
 * GDPR erasure endpoints. Lives here (not in OrganizationsModule) so the erasure
 * orchestrator can import Organizations/Media one-way without a circular module
 * dependency. Account erasure is triggered from `DELETE /settings`.
 */
@ApiTags('organizations')
@ApiBearerAuthRequired()
@ApiCommonErrorResponses()
@Controller('organizations')
@UseGuards(OrgMembershipGuard)
export class DataDeletionController {
  constructor(
    private readonly dataDeletionService: DataDeletionService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  /** Queue an organization for GDPR deletion (30-day grace, then cascade). */
  @Delete(':organizationId')
  @RequireOrgRole({ roles: [OrganizationRole.ADMIN], idParam: 'organizationId' })
  async deleteOrganization(
    @CurrentUser() user: RequestUser,
    @Param('organizationId') organizationId: string,
  ) {
    await this.organizationsService.assertNotLastOrganization(user.id);
    return this.dataDeletionService.requestOrgDeletion(organizationId, user.id);
  }
}

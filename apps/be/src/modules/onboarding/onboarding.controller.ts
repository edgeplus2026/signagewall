import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { RequiredOrganizationId } from '../../common/decorators/current-organization.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireOrgRole } from '../../common/decorators/org-roles.decorator';
import { OrgMembershipGuard } from '../../common/guards/org-membership.guard';
import type { RequestUser } from '../../common/interfaces/request-user.interface';
import {
  ApiCommonErrorResponses,
  ApiOrgScoped,
  ApiSuccessResponse,
  OnboardingStateSchema,
} from '../../common/swagger';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';
import { OnboardingService } from './onboarding.service';

@ApiTags('onboarding')
@ApiOrgScoped()
@ApiCommonErrorResponses()
@Controller('onboarding')
@UseGuards(OrgMembershipGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  /** Drives the header progress ring and the floating setup checklist. */
  @Get()
  @RequireOrgRole()
  @ApiSuccessResponse(OnboardingStateSchema)
  getState(
    @CurrentUser() user: RequestUser,
    @RequiredOrganizationId() organizationId: string,
  ) {
    return this.onboardingService.getState(user.id, organizationId);
  }

  @Patch()
  @RequireOrgRole()
  @ApiSuccessResponse(OnboardingStateSchema)
  update(
    @CurrentUser() user: RequestUser,
    @RequiredOrganizationId() organizationId: string,
    @Body() dto: UpdateOnboardingDto,
  ) {
    return this.onboardingService.update(user.id, organizationId, dto);
  }
}

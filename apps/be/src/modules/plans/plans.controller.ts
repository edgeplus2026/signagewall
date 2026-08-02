import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/interfaces/request-user.interface';
import {
  ApiBearerAuthRequired,
  ApiCommonErrorResponses,
  ApiSuccessNullResponse,
  ApiSuccessResponse,
  PlanEntitlementSchema,
} from '../../common/swagger';
import { CreateUpgradeRequestDto } from './dto/create-upgrade-request.dto';
import { PlansService } from './plans.service';

@ApiTags('plans')
@ApiBearerAuthRequired()
@ApiCommonErrorResponses()
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  /** Drives the header button, the trial countdown and the create-screen gate. */
  @Get('me')
  @ApiSuccessResponse(PlanEntitlementSchema)
  getMyPlan(@CurrentUser() user: RequestUser) {
    return this.plansService.getEntitlementResponse(user.id);
  }

  @Post('upgrade-request')
  @ApiSuccessNullResponse()
  async requestUpgrade(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateUpgradeRequestDto,
  ): Promise<null> {
    await this.plansService.createUpgradeRequest(user.id, dto);
    return null;
  }
}

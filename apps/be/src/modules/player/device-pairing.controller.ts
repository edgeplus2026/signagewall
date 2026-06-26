import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import { ApiTags } from '@nestjs/swagger';

import { AuthThrottle } from '../../common/decorators/auth-throttle.decorator';
import { RequiredOrganizationId } from '../../common/decorators/current-organization.decorator';
import { RequireOrgRole } from '../../common/decorators/org-roles.decorator';
import { OrgMembershipGuard } from '../../common/guards/org-membership.guard';
import {
  ApiCommonErrorResponses,
  ApiOrgScoped,
  ApiSuccessNullResponse,
  ApiSuccessResponse,
} from '../../common/swagger';
import { PairDeviceDto } from './dto/pair-device.dto';
import { PlayerService } from './player.service';

/**
 * CMS-facing device pairing, scoped to a screen (a screen IS the player). Lives
 * on the `screens` path so the "Device" tab on the screen detail page can pair,
 * inspect, and unpair the bound display.
 */
@ApiTags('screens')
@ApiOrgScoped()
@ApiCommonErrorResponses()
@Controller('screens')
@UseGuards(OrgMembershipGuard)
export class DevicePairingController {
  constructor(private readonly playerService: PlayerService) {}

  @Post(':screenId/pair')
  @RequireOrgRole()
  @AuthThrottle()
  @ApiSuccessResponse(Object)
  pair(
    @RequiredOrganizationId() organizationId: string,
    @Param('screenId', ParseObjectIdPipe) screenId: string,
    @Body() dto: PairDeviceDto,
  ) {
    return this.playerService.pairScreenDevice(
      organizationId,
      screenId,
      dto.code,
    );
  }

  @Get(':screenId/device')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  getDevice(
    @RequiredOrganizationId() organizationId: string,
    @Param('screenId', ParseObjectIdPipe) screenId: string,
  ) {
    return this.playerService.getScreenDevice(organizationId, screenId);
  }

  @Delete(':screenId/device')
  @RequireOrgRole()
  @HttpCode(HttpStatus.OK)
  @ApiSuccessNullResponse()
  async unpair(
    @RequiredOrganizationId() organizationId: string,
    @Param('screenId', ParseObjectIdPipe) screenId: string,
  ): Promise<null> {
    await this.playerService.unpairScreenDevice(organizationId, screenId);
    return null;
  }
}

import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AuthThrottle } from '../../common/decorators/auth-throttle.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import {
  AcceptInvitationResponseSchema,
  ApiBearerAuthRequired,
  ApiCommonErrorResponses,
  ApiSuccessNullResponse,
  ApiSuccessResponse,
  InvitationPreviewSchema,
} from '../../common/swagger';
import type { RequestUser } from '../../common/interfaces/request-user.interface';
import { MembersService } from './members.service';

@ApiTags('invitations')
@ApiCommonErrorResponses()
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly membersService: MembersService) {}

  @Public()
  @AuthThrottle()
  @Get(':token')
  @ApiSuccessResponse(InvitationPreviewSchema)
  preview(@Param('token') token: string) {
    return this.membersService.getInvitationPreview(token);
  }

  @Post(':token/accept')
  @ApiBearerAuthRequired()
  @ApiSuccessResponse(AcceptInvitationResponseSchema)
  accept(@CurrentUser() user: RequestUser, @Param('token') token: string) {
    return this.membersService.acceptInvitation(user.id, token);
  }

  @Post(':token/decline')
  @ApiBearerAuthRequired()
  @ApiSuccessNullResponse()
  async decline(
    @CurrentUser() user: RequestUser,
    @Param('token') token: string,
  ) {
    await this.membersService.declineInvitation(user.id, token);
    return null;
  }
}

import {
  Controller,
  Delete,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiredOrganizationId } from '../../common/decorators/current-organization.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RequireOrgRole } from '../../common/decorators/org-roles.decorator';
import { OrgMembershipGuard } from '../../common/guards/org-membership.guard';
import type { RequestUser } from '../../common/interfaces/request-user.interface';
import {
  ApiCommonErrorResponses,
  ApiOrgScoped,
  ApiSuccessNullResponse,
  ApiSuccessResponse,
} from '../../common/swagger';
import { ConnectionsService } from './connections.service';
import { ConnectionProvider } from './schemas/app-connection.schema';

@ApiTags('connections')
@ApiCommonErrorResponses()
@Controller('connections')
export class ConnectionsController {
  constructor(
    private readonly connectionsService: ConnectionsService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @ApiOrgScoped()
  @UseGuards(OrgMembershipGuard)
  @RequireOrgRole()
  @ApiSuccessResponse(Object, { isArray: true })
  list(@RequiredOrganizationId() organizationId: string) {
    return this.connectionsService.list(organizationId);
  }

  @Delete(':id')
  @ApiOrgScoped()
  @UseGuards(OrgMembershipGuard)
  @RequireOrgRole()
  @ApiSuccessNullResponse()
  async remove(
    @RequiredOrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    await this.connectionsService.delete(organizationId, id);
    return null;
  }

  @Get('oauth/:provider/start')
  @ApiOrgScoped()
  @UseGuards(OrgMembershipGuard)
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  @ApiOperation({
    summary:
      'Build the provider authorization URL for a connection OAuth flow.',
  })
  start(
    @RequiredOrganizationId() organizationId: string,
    @CurrentUser() user: RequestUser,
    @Param('provider') provider: ConnectionProvider,
    @Query('appSlug') appSlug: string,
  ): { url: string } {
    // Returns the URL (rather than redirecting) so the authenticated XHR carries
    // the org/user identity; the CMS then navigates the browser to it.
    const url = this.connectionsService.buildAuthorizationUrl({
      organizationId,
      userId: user.id,
      provider,
      appSlug,
    });
    return { url };
  }

  @Public()
  @Get('oauth/:provider/callback')
  @ApiOperation({
    summary:
      'Provider OAuth callback — stores the connection and returns to the CMS.',
  })
  async callback(
    @Param('provider') provider: ConnectionProvider,
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ): Promise<void> {
    const frontendUrl = this.configService.getOrThrow<string>('frontendUrl');
    const path =
      this.configService.get<string>('frontendConnectionsCallbackPath') ??
      '/apps/connections/callback';
    const target = new URL(path, frontendUrl);

    try {
      const { connection } = await this.connectionsService.handleCallback(
        provider,
        code,
        state,
      );
      target.searchParams.set('status', 'connected');
      target.searchParams.set('connectionId', connection.id);
      target.searchParams.set('account', connection.accountLabel);
    } catch {
      // Never leak details to the browser redirect; the CMS shows a generic error.
      target.searchParams.set('status', 'error');
    }

    res.redirect(target.toString());
  }
}

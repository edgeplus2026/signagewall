import {
  Controller,
  Get,
  Inject,
  Param,
  Query,
  Res,
  UseGuards,
  forwardRef,
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
  ApiSuccessResponse,
} from '../../common/swagger';
import { AppInstancesService } from '../apps/app-instances.service';
import { ConnectionsService } from './connections.service';
import { ConnectionProvider } from './schemas/app-connection.schema';

@ApiTags('connections')
@ApiCommonErrorResponses()
@Controller('connections')
export class ConnectionsController {
  constructor(
    private readonly connectionsService: ConnectionsService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => AppInstancesService))
    private readonly appInstancesService: AppInstancesService,
  ) {}

  @Get(':id')
  @ApiOrgScoped()
  @UseGuards(OrgMembershipGuard)
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  @ApiOperation({
    summary:
      "Token-free summary of a connection (config form's connected state).",
  })
  getOne(
    @RequiredOrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.connectionsService.getSummary(organizationId, id);
  }

  @Get(':id/canva/designs')
  @ApiOrgScoped()
  @UseGuards(OrgMembershipGuard)
  @RequireOrgRole()
  @ApiSuccessResponse(Object, { isArray: true })
  @ApiOperation({
    summary:
      'Search the Canva designs reachable through a connection (config form picker).',
  })
  listCanvaDesigns(
    @RequiredOrganizationId() organizationId: string,
    @Param('id') id: string,
    @Query('query') query?: string,
  ) {
    return this.connectionsService.listCanvaDesigns(
      organizationId,
      id,
      query ?? '',
    );
  }

  @Get('oauth/:provider/start')
  @ApiOrgScoped()
  @UseGuards(OrgMembershipGuard)
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  @ApiOperation({
    summary:
      'Build the provider authorization URL for an instance connection OAuth flow.',
  })
  start(
    @RequiredOrganizationId() organizationId: string,
    @CurrentUser() user: RequestUser,
    @Param('provider') provider: ConnectionProvider,
    @Query('appSlug') appSlug: string,
    @Query('instanceId') instanceId: string,
  ): { url: string } {
    // Returns the URL (rather than redirecting) so the authenticated XHR carries
    // the org/user identity; the CMS then navigates the browser to it. The
    // resulting connection is bound to `instanceId` on callback.
    const url = this.connectionsService.buildAuthorizationUrl({
      organizationId,
      userId: user.id,
      provider,
      appSlug,
      instanceId,
    });
    return { url };
  }

  @Public()
  @Get('oauth/:provider/callback')
  @ApiOperation({
    summary:
      'Provider OAuth callback — binds the connection to its instance and returns to it.',
  })
  async callback(
    @Param('provider') provider: ConnectionProvider,
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ): Promise<void> {
    const frontendUrl = this.configService.getOrThrow<string>('frontendUrl');

    try {
      const { organizationId, instanceId, connection } =
        await this.connectionsService.handleCallback(provider, code, state);
      // Bind the new connection to its instance, then return to that instance.
      const instance = await this.appInstancesService.bindConnection(
        organizationId,
        instanceId,
        connection.id,
      );
      const target = new URL(
        `/apps/${instance.appId}/instances/${instanceId}`,
        frontendUrl,
      );
      target.searchParams.set('connected', '1');
      target.searchParams.set('account', connection.accountLabel);
      res.redirect(target.toString());
    } catch {
      // Never leak details to the browser redirect; the CMS shows a generic error.
      const target = new URL('/apps', frontendUrl);
      target.searchParams.set('connect_error', '1');
      res.redirect(target.toString());
    }
  }
}

import {
  Controller,
  Get,
  Inject,
  Logger,
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
  private readonly logger = new Logger(ConnectionsController.name);

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

  @Get(':id/browse/:source')
  @ApiOrgScoped()
  @UseGuards(OrgMembershipGuard)
  @RequireOrgRole()
  @ApiSuccessResponse(Object, { isArray: true })
  @ApiOperation({
    summary:
      "Search a connection's resources for a remote-select config field (e.g. Canva designs, Google calendars).",
  })
  browse(
    @RequiredOrganizationId() organizationId: string,
    @Param('id') id: string,
    @Param('source') source: string,
    @Query('query') query?: string,
    @Query('workspaceId') workspaceId?: string,
    @Query('reportId') reportId?: string,
  ) {
    return this.connectionsService.browseRemoteOptions(
      organizationId,
      id,
      source,
      query ?? '',
      {
        ...(workspaceId ? { workspaceId } : {}),
        ...(reportId ? { reportId } : {}),
      },
    );
  }

  @Get(':id/tabular/headers')
  @ApiOrgScoped()
  @UseGuards(OrgMembershipGuard)
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  @ApiOperation({
    summary:
      "Read a synced spreadsheet's header row for the column-mapping config control.",
  })
  tabularHeaders(
    @RequiredOrganizationId() organizationId: string,
    @Param('id') id: string,
    @Query('kind') kind?: string,
    @Query('fileId') fileId?: string,
    @Query('worksheet') worksheet?: string,
  ) {
    return this.connectionsService.fetchTabularHeaders(
      organizationId,
      id,
      kind ?? '',
      fileId ?? '',
      worksheet ?? '',
    );
  }

  @Get('oauth/:provider/start')
  @ApiOrgScoped()
  @UseGuards(OrgMembershipGuard)
  // Write-intent despite the GET: completing this flow rebinds the instance's
  // connection credentials, so a read-only viewer must not be able to start it.
  @RequireOrgRole({ write: true })
  @ApiSuccessResponse(Object)
  @ApiOperation({
    summary:
      'Build the provider authorization URL for an instance connection OAuth flow.',
  })
  async start(
    @RequiredOrganizationId() organizationId: string,
    @CurrentUser() user: RequestUser,
    @Param('provider') provider: ConnectionProvider,
    @Query('appSlug') appSlug: string,
    @Query('instanceId') instanceId: string,
  ): Promise<{ url: string }> {
    // Returns the URL (rather than redirecting) so the authenticated XHR carries
    // the org/user identity; the CMS then navigates the browser to it. The
    // resulting connection is bound to `instanceId` on callback.
    const url = await this.connectionsService.buildAuthorizationUrl({
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
    // Providers report a refused/cancelled consent by sending `error` INSTEAD of
    // `code`. Without reading it we would try to exchange an undefined code and
    // log a meaningless failure for the most ordinary outcome there is.
    @Query('error') error: string | undefined,
    @Query('error_description') errorDescription: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    if (error) {
      this.logger.warn(
        `OAuth consent refused for provider "${provider}": ${error}` +
          (errorDescription ? ` (${errorDescription})` : ''),
      );
      await this.redirectWithError(res, state, 'denied');
      return;
    }

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
        this.frontendUrl(),
      );
      target.searchParams.set('connected', '1');
      target.searchParams.set('account', connection.accountLabel);
      res.redirect(target.toString());
    } catch (caught) {
      // Log server-side (with the provider) so a failed connect is diagnosable;
      // never leak details to the browser redirect — the CMS shows a generic
      // error keyed on the coarse reason below.
      this.logger.warn(
        `OAuth callback failed for provider "${provider}": ${String(caught)}`,
      );
      await this.redirectWithError(res, state, 'failed');
    }
  }

  /**
   * Return the operator to the instance they started the connect from, with a
   * coarse failure reason for the toast.
   *
   * The instance page is the ONLY page that reads these params, so falling back
   * to the app catalog means the failure is shown nowhere at all — which is why
   * the state is re-read here purely to recover the route. It is still signature-
   * checked ({@link ConnectionsService.peekState}); it just reports failure
   * instead of throwing, because the state may BE what failed. A state we cannot
   * verify, or an instance we cannot load, is itself a good reason not to send
   * anyone to an instance page, so that path lands on the catalog and at least
   * says something there.
   */
  private async redirectWithError(
    res: Response,
    state: string,
    reason: 'denied' | 'failed',
  ): Promise<void> {
    const frontendUrl = this.frontendUrl();
    let path = '/apps';

    const payload = this.connectionsService.peekState(state ?? '');
    if (payload) {
      try {
        const instance = await this.appInstancesService.getById(
          payload.organizationId,
          payload.instanceId,
        );
        path = `/apps/${instance.appId}/instances/${payload.instanceId}`;
      } catch {
        // Instance gone or not readable — the catalog fallback covers it.
      }
    }

    const target = new URL(path, frontendUrl);
    target.searchParams.set('connect_error', reason);
    res.redirect(target.toString());
  }

  private frontendUrl(): string {
    return this.configService.getOrThrow<string>('frontendUrl');
  }
}

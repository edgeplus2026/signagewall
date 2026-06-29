import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiredOrganizationId } from '../../common/decorators/current-organization.decorator';
import { RequireOrgRole } from '../../common/decorators/org-roles.decorator';
import { OrgMembershipGuard } from '../../common/guards/org-membership.guard';
import type { RequestUser } from '../../common/interfaces/request-user.interface';
import { OrganizationRole } from '../organizations/schemas/organization-membership.schema';
import {
  ApiCommonErrorResponses,
  ApiOrgScoped,
  ApiSuccessNullResponse,
  ApiSuccessResponse,
} from '../../common/swagger';
import { AppCategoriesService } from './app-categories.service';
import { AppDataService } from './app-data.service';
import { AppsService } from './apps.service';
import { PreviewAppDataDto } from './dto/preview-app-data.dto';

/** Organization-facing catalog browse + install. */
@ApiTags('apps')
@ApiOrgScoped()
@ApiCommonErrorResponses()
@Controller('apps')
@UseGuards(OrgMembershipGuard)
export class AppsController {
  constructor(
    private readonly appsService: AppsService,
    private readonly categoriesService: AppCategoriesService,
    private readonly appDataService: AppDataService,
  ) {}

  @Get()
  @RequireOrgRole()
  @ApiSuccessResponse(Object, { isArray: true })
  list(@RequiredOrganizationId() organizationId: string) {
    return this.appsService.listCatalog(organizationId);
  }

  /** Catalog categories, for the org catalog filter (read-only). */
  @Get('categories')
  @RequireOrgRole()
  @ApiSuccessResponse(Object, { isArray: true })
  listCategories() {
    return this.categoriesService.list();
  }

  @Get(':id')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  getById(
    @RequiredOrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.appsService.getCatalogApp(organizationId, id);
  }

  @Post(':id/install')
  @RequireOrgRole({ roles: [OrganizationRole.ADMIN] })
  @ApiSuccessResponse(Object)
  install(
    @RequiredOrganizationId() organizationId: string,
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.appsService.install(organizationId, id, user.id);
  }

  @Delete(':id/install')
  @RequireOrgRole({ roles: [OrganizationRole.ADMIN] })
  @ApiSuccessNullResponse()
  async uninstall(
    @RequiredOrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<null> {
    await this.appsService.uninstall(organizationId, id);
    return null;
  }

  /**
   * Resolve the connector payload for an app's live preview, given a draft
   * config. `static` apps return `{ data: null }`. Org-scoped (the guard), but
   * the underlying cache is global — previewing a key real screens already use
   * is an instant hit. `slug` (not id) so the preview works against the manifest.
   */
  @Post(':slug/preview-data')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  previewData(@Param('slug') slug: string, @Body() dto: PreviewAppDataDto) {
    return this.appDataService.getPreviewData(slug, dto.config);
  }
}

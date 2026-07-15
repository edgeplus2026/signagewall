import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import { ApiTags } from '@nestjs/swagger';

import { RequiredOrganizationId } from '../../common/decorators/current-organization.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireOrgRole } from '../../common/decorators/org-roles.decorator';
import { OrgMembershipGuard } from '../../common/guards/org-membership.guard';
import type { RequestUser } from '../../common/interfaces/request-user.interface';
import {
  ApiCommonErrorResponses,
  ApiOrgScoped,
  ApiSuccessNullResponse,
  ApiSuccessResponse,
} from '../../common/swagger';
import {
  AiGenerationJobSchema,
  AiGenerationPlaylistSchema,
} from '../../common/swagger/schemas/ai-content.response';
import { AiContentService } from './ai-content.service';
import { CreateAiGenerationDto } from './dto/create-ai-generation.dto';
import { MaterializeAiGenerationDto } from './dto/materialize-ai-generation.dto';

@ApiTags('ai-content')
@ApiOrgScoped()
@ApiCommonErrorResponses()
@Controller('ai-content')
@UseGuards(OrgMembershipGuard)
export class AiContentController {
  constructor(private readonly aiContentService: AiContentService) {}

  /** Enqueue a generation. Enforces the per-user daily quota. */
  @Post('generations')
  @RequireOrgRole()
  @ApiSuccessResponse(AiGenerationJobSchema)
  generate(
    @RequiredOrganizationId() organizationId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateAiGenerationDto,
  ) {
    return this.aiContentService.enqueue(organizationId, user.id, dto);
  }

  /** The current user's recent generations in this org (the history table). */
  @Get('generations')
  @RequireOrgRole()
  @ApiSuccessResponse(AiGenerationJobSchema, { isArray: true })
  list(
    @RequiredOrganizationId() organizationId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.aiContentService.listForUser(organizationId, user.id);
  }

  /** Poll a generation's status/result (also used to refetch on the socket nudge). */
  @Get('generations/:id')
  @RequireOrgRole()
  @ApiSuccessResponse(AiGenerationJobSchema)
  getById(
    @RequiredOrganizationId() organizationId: string,
    @CurrentUser() user: RequestUser,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.aiContentService.getForUser(organizationId, user.id, id);
  }

  /** Delete a generation from history (does not delete any created playlist). */
  @Delete('generations/:id')
  @RequireOrgRole()
  @ApiSuccessNullResponse()
  async remove(
    @RequiredOrganizationId() organizationId: string,
    @CurrentUser() user: RequestUser,
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<null> {
    await this.aiContentService.deleteForUser(organizationId, user.id, id);
    return null;
  }

  /** Materialize the generated slides into a new draft playlist (idempotent). */
  @Post('generations/:id/playlist')
  @RequireOrgRole()
  @ApiSuccessResponse(AiGenerationPlaylistSchema)
  createPlaylist(
    @RequiredOrganizationId() organizationId: string,
    @CurrentUser() user: RequestUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: MaterializeAiGenerationDto,
  ) {
    return this.aiContentService.materialize(
      organizationId,
      user.id,
      id,
      dto.name,
    );
  }
}

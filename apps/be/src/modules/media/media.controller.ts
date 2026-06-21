import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiredOrganizationId } from '../../common/decorators/current-organization.decorator';
import { RequireOrgRole } from '../../common/decorators/org-roles.decorator';
import { OrgMembershipGuard } from '../../common/guards/org-membership.guard';
import type { RequestUser } from '../../common/interfaces/request-user.interface';
import {
  ApiCommonErrorResponses,
  ApiOrgScoped,
  ApiSuccessNullResponse,
  ApiSuccessResponse,
} from '../../common/swagger';
import { MEDIA_MAX_FILE_SIZE_BYTES } from './media.constants';
import { CreateFolderDto } from './dto/create-folder.dto';
import { DeleteMediaDto } from './dto/delete-media.dto';
import { MediaListQueryDto } from './dto/media-list-query.dto';
import { MoveMediaDto } from './dto/move-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import { UploadMediaBodyDto } from './dto/upload-media.dto';
import { MediaItemResponseDto } from './mappers/media.mapper';
import { MediaService } from './media.service';

@ApiTags('media')
@ApiOrgScoped()
@ApiCommonErrorResponses()
@Controller('media')
@UseGuards(OrgMembershipGuard)
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @RequireOrgRole()
  @ApiSuccessResponse(Object, { isArray: true })
  list(
    @RequiredOrganizationId() organizationId: string,
    @Query() query: MediaListQueryDto,
  ): Promise<MediaItemResponseDto[]> {
    return this.mediaService.list(organizationId, query);
  }

  @Get('files')
  @RequireOrgRole()
  @ApiSuccessResponse(Object, { isArray: true })
  listMedia(
    @RequiredOrganizationId() organizationId: string,
    @Query() query: MediaListQueryDto,
  ): Promise<MediaItemResponseDto[]> {
    return this.mediaService.listMedia(organizationId, query);
  }

  @Get('folders')
  @RequireOrgRole()
  @ApiSuccessResponse(Object, { isArray: true })
  listFolders(
    @RequiredOrganizationId() organizationId: string,
    @Query('parentId') parentId?: string,
  ): Promise<MediaItemResponseDto[]> {
    return this.mediaService.listFolders(organizationId, parentId ?? null);
  }

  @Get('path')
  @RequireOrgRole()
  @ApiSuccessResponse(Object, { isArray: true })
  getFolderPath(
    @RequiredOrganizationId() organizationId: string,
    @Query('folderId') folderId?: string,
  ): Promise<MediaItemResponseDto[]> {
    return this.mediaService.getFolderPath(organizationId, folderId ?? null);
  }

  @Get(':id/download')
  @RequireOrgRole()
  async download(
    @RequiredOrganizationId() organizationId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.mediaService.getDownloadFile(organizationId, id);

    res.set({
      'Content-Type': file.contentType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(file.filename)}"`,
      ...(file.contentLength !== undefined
        ? { 'Content-Length': String(file.contentLength) }
        : {}),
    });

    file.stream.on('error', () => {
      if (!res.headersSent) {
        res.status(502);
      }
      res.end();
    });

    file.stream.pipe(res);
  }

  @Get(':id')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  getById(
    @RequiredOrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<MediaItemResponseDto> {
    return this.mediaService.getById(organizationId, id);
  }

  @Post('folders')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  createFolder(
    @CurrentUser() user: RequestUser,
    @RequiredOrganizationId() organizationId: string,
    @Body() dto: CreateFolderDto,
  ): Promise<MediaItemResponseDto> {
    return this.mediaService.createFolder(organizationId, user.id, dto);
  }

  @Post('upload')
  @RequireOrgRole()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        // Optional video poster frame captured client-side; used as the
        // thumbnail source so videos get a real preview instead of a placeholder.
        poster: { type: 'string', format: 'binary', nullable: true },
        parentId: { type: 'string', nullable: true },
        duration: {
          type: 'integer',
          nullable: true,
          description: 'Video duration in seconds (client-provided)',
        },
      },
      required: ['file'],
    },
  })
  @ApiSuccessResponse(Object)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'file', maxCount: 1 },
        { name: 'poster', maxCount: 1 },
      ],
      {
        limits: {
          // Kept in sync with `media.maxFileSizeBytes` (same env var) so Multer
          // and the service-level check agree on the ceiling.
          fileSize:
            Number(process.env.MEDIA_MAX_FILE_SIZE_BYTES) ||
            MEDIA_MAX_FILE_SIZE_BYTES,
          files: 2,
        },
      },
    ),
  )
  upload(
    @CurrentUser() user: RequestUser,
    @RequiredOrganizationId() organizationId: string,
    @UploadedFiles()
    files: {
      file?: Express.Multer.File[];
      poster?: Express.Multer.File[];
    },
    @Body() body: UploadMediaBodyDto,
  ): Promise<MediaItemResponseDto> {
    return this.mediaService.uploadFile(
      organizationId,
      user.id,
      files.file?.[0] as Express.Multer.File,
      body.parentId ?? null,
      files.poster?.[0],
      body.duration,
    );
  }

  @Patch(':id')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  update(
    @RequiredOrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMediaDto,
  ): Promise<MediaItemResponseDto> {
    return this.mediaService.update(organizationId, id, dto);
  }

  @Post('move')
  @RequireOrgRole()
  @ApiSuccessNullResponse()
  async move(
    @RequiredOrganizationId() organizationId: string,
    @Body() dto: MoveMediaDto,
  ): Promise<null> {
    await this.mediaService.move(organizationId, dto);
    return null;
  }

  @Post('delete')
  @RequireOrgRole()
  @ApiSuccessNullResponse()
  async delete(
    @RequiredOrganizationId() organizationId: string,
    @Body() dto: DeleteMediaDto,
  ): Promise<null> {
    await this.mediaService.delete(organizationId, dto.ids);
    return null;
  }
}

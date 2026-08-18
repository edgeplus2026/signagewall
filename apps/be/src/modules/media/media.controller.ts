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
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

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
import {
  MEDIA_MAX_FILE_SIZE_BYTES,
  MEDIA_UPLOAD_TEMP_DIR_NAME,
} from './media.constants';
import { CloudImportService } from './cloud-import.service';
import { CloudImportResponseDto } from './dto/cloud-import-result.dto';
import { CreateFolderDto } from './dto/create-folder.dto';
import { DeleteMediaDto } from './dto/delete-media.dto';
import { ImportCloudMediaDto } from './dto/import-cloud-media.dto';
import { MediaListQueryDto } from './dto/media-list-query.dto';
import { MoveMediaDto } from './dto/move-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import { UploadMediaBodyDto } from './dto/upload-media.dto';
import { MediaItemResponseDto } from './mappers/media.mapper';
import { MediaService } from './media.service';

/**
 * Directory multer stages uploads into, created once on first use.
 *
 * Its own directory rather than bare `tmpdir()` so the stale-upload sweep can
 * tell our files from everything else the process writes there.
 */
let cachedUploadTempDir: string | undefined;

function uploadTempDir(): string {
  if (!cachedUploadTempDir) {
    const dir = join(tmpdir(), MEDIA_UPLOAD_TEMP_DIR_NAME);
    mkdirSync(dir, { recursive: true });
    cachedUploadTempDir = dir;
  }

  return cachedUploadTempDir;
}

@ApiTags('media')
@ApiOrgScoped()
@ApiCommonErrorResponses()
@Controller('media')
@UseGuards(OrgMembershipGuard)
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly cloudImportService: CloudImportService,
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
        // Staged on disk, never in the heap. Multer's default memory storage
        // held the whole file in a Buffer, which is why the ceiling had to stay
        // at 10 MB: a handful of concurrent video uploads was enough to put the
        // container near the OOM killer that has already claimed ffmpeg once.
        // The service streams this file straight to R2 and deletes it.
        //
        // `dest` rather than `diskStorage({ destination })`: they do the same
        // thing, but `dest` is plain configuration while `diskStorage` means
        // importing `multer` — which this package does not depend on. It only
        // declares `@types/multer`, so that import type-checks and then dies at
        // runtime with MODULE_NOT_FOUND, which is exactly how it reached
        // production and took the API down.
        dest: uploadTempDir(),
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

  @Post('import')
  @RequireOrgRole()
  // Stricter than the global limit: each call fans out to outbound provider
  // downloads, so cap how often a single org/user can trigger it.
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiSuccessResponse(CloudImportResponseDto)
  import(
    @CurrentUser() user: RequestUser,
    @RequiredOrganizationId() organizationId: string,
    @Body() dto: ImportCloudMediaDto,
  ): Promise<CloudImportResponseDto> {
    return this.cloudImportService.import(organizationId, user.id, dto);
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

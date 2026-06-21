import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiredOrganizationId } from '../../common/decorators/current-organization.decorator';
import { RequireOrgRole } from '../../common/decorators/org-roles.decorator';
import { OrgMembershipGuard } from '../../common/guards/org-membership.guard';
import type { RequestUser } from '../../common/interfaces/request-user.interface';
import {
  ApiCommonErrorResponses,
  ApiOrgScoped,
  ApiSuccessResponse,
} from '../../common/swagger';
import { MediaItemResponseDto } from '../media/mappers/media.mapper';
import { ImportStockMediaDto } from './dto/import-stock-media.dto';
import { StockMediaCuratedQueryDto } from './dto/stock-media-curated.query';
import { StockMediaItemQueryDto } from './dto/stock-media-item.query';
import { StockMediaSearchQueryDto } from './dto/stock-media-search.query';
import {
  StockMediaItemDto,
  StockMediaPageDto,
} from './providers/stock-media-provider.types';
import { StockMediaService } from './stock-media.service';

@ApiTags('stock-media')
@ApiOrgScoped()
@ApiCommonErrorResponses()
@Controller('stock-media')
@UseGuards(OrgMembershipGuard)
// Stricter than the global limit: protects the shared upstream provider key
// from a single org/user exhausting its quota.
@Throttle({ default: { limit: 40, ttl: 60_000 } })
export class StockMediaController {
  constructor(private readonly stockMediaService: StockMediaService) {}

  @Get('search')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  search(@Query() query: StockMediaSearchQueryDto): Promise<StockMediaPageDto> {
    return this.stockMediaService.search(query);
  }

  @Get('curated')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  curated(
    @Query() query: StockMediaCuratedQueryDto,
  ): Promise<StockMediaPageDto> {
    return this.stockMediaService.curated(query);
  }

  @Get('item/:id')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  getItem(
    @Param('id') id: string,
    @Query() query: StockMediaItemQueryDto,
  ): Promise<StockMediaItemDto> {
    return this.stockMediaService.getItem(id, query.mediaType);
  }

  @Post('import')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  import(
    @CurrentUser() user: RequestUser,
    @RequiredOrganizationId() organizationId: string,
    @Body() dto: ImportStockMediaDto,
  ): Promise<MediaItemResponseDto> {
    return this.stockMediaService.import(organizationId, user.id, dto);
  }
}

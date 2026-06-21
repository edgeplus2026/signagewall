import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

import {
  StockMediaTypeFilter,
  STOCK_MEDIA_MAX_PAGE,
  STOCK_MEDIA_MAX_PER_PAGE,
} from '../stock-media.constants';

export class StockMediaCuratedQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: STOCK_MEDIA_MAX_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(STOCK_MEDIA_MAX_PAGE)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: STOCK_MEDIA_MAX_PER_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(STOCK_MEDIA_MAX_PER_PAGE)
  perPage?: number;

  @ApiPropertyOptional({
    enum: StockMediaTypeFilter,
    description: 'video returns popular videos; otherwise curated photos.',
  })
  @IsOptional()
  @IsEnum(StockMediaTypeFilter)
  mediaType?: StockMediaTypeFilter;
}

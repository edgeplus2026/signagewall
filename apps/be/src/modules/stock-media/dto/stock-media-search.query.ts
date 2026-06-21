import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import {
  StockColor,
  StockMediaTypeFilter,
  StockOrientation,
  STOCK_MEDIA_MAX_PAGE,
  STOCK_MEDIA_MAX_PER_PAGE,
  STOCK_MEDIA_MAX_QUERY_LENGTH,
} from '../stock-media.constants';

export class StockMediaSearchQueryDto {
  @ApiProperty({ example: 'office' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(STOCK_MEDIA_MAX_QUERY_LENGTH)
  query!: string;

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

  @ApiPropertyOptional({ enum: StockMediaTypeFilter })
  @IsOptional()
  @IsEnum(StockMediaTypeFilter)
  mediaType?: StockMediaTypeFilter;

  @ApiPropertyOptional({ enum: StockOrientation })
  @IsOptional()
  @IsEnum(StockOrientation)
  orientation?: StockOrientation;

  @ApiPropertyOptional({ enum: StockColor, description: 'Images only.' })
  @IsOptional()
  @IsEnum(StockColor)
  color?: StockColor;
}

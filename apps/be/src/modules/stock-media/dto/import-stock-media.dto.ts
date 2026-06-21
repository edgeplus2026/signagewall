import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

import { StockMediaItemType } from '../stock-media.constants';

export class ImportStockMediaDto {
  @ApiProperty({ description: 'Provider-native asset id.', example: '3573351' })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({ enum: StockMediaItemType })
  @IsEnum(StockMediaItemType)
  mediaType!: StockMediaItemType;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Destination folder; root when omitted.',
  })
  @IsOptional()
  @IsMongoId()
  parentId?: string | null;
}

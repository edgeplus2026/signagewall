import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

import { ScreenItemType } from '../schemas/screen.schema';

export class ReplaceScreenItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  id?: string;

  @ApiProperty({ enum: ScreenItemType })
  @IsIn([ScreenItemType.MEDIA, ScreenItemType.PLAYLIST])
  type!: ScreenItemType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  mediaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  playlistId?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 3600 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3600)
  duration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  disabled?: boolean;
}

export class ReplaceScreenItemsDto {
  @ApiProperty({ type: [ReplaceScreenItemDto] })
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ReplaceScreenItemDto)
  items!: ReplaceScreenItemDto[];

  /**
   * The `updatedAt` the client last observed. When provided, the write is
   * rejected with 409 if the screen changed in the meantime (lost-update
   * protection for concurrent editors).
   */
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expectedUpdatedAt?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsMongoId,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class ReplacePlaylistItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  id?: string;

  @ApiProperty()
  @IsMongoId()
  mediaId!: string;

  @ApiProperty({ minimum: 1, maximum: 3600 })
  @IsInt()
  @Min(1)
  @Max(3600)
  duration!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  disabled?: boolean;
}

export class ReplacePlaylistItemsDto {
  @ApiProperty({ type: [ReplacePlaylistItemDto] })
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ReplacePlaylistItemDto)
  items!: ReplacePlaylistItemDto[];

  /**
   * The `updatedAt` the client last observed. When provided, the write is
   * rejected with 409 if the playlist changed in the meantime (lost-update
   * protection for concurrent editors).
   */
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expectedUpdatedAt?: string;
}

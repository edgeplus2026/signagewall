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

import { PlaylistItemType } from '../schemas/playlist.schema';

export class ReplacePlaylistItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  id?: string;

  /**
   * Item kind. Optional for back-compat with clients that only ever sent media
   * items (no `type`); the service defaults a missing value to `media`.
   */
  @ApiPropertyOptional({ enum: PlaylistItemType })
  @IsOptional()
  @IsIn([PlaylistItemType.MEDIA, PlaylistItemType.APP])
  type?: PlaylistItemType;

  /** Required when `type` is `media`. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  mediaId?: string;

  /** Required when `type` is `app`. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  appInstanceId?: string;

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

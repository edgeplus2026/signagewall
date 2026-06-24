import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsOptional } from 'class-validator';

import { ScheduleContentType, ScheduleFit } from '../schemas/schedule.schema';

/** A reference to schedulable content (media or playlist), shared by filler and events. */
export class ScheduleContentRefDto {
  @ApiProperty({ enum: ScheduleContentType })
  @IsEnum(ScheduleContentType)
  contentType!: ScheduleContentType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  mediaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  playlistId?: string;

  @ApiPropertyOptional({ enum: ScheduleFit })
  @IsOptional()
  @IsEnum(ScheduleFit)
  fit?: ScheduleFit;
}

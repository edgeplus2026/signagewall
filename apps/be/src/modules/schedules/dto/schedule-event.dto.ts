import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

import {
  ScheduleContentType,
  ScheduleEventType,
  ScheduleFit,
  ScheduleRepeat,
} from '../schemas/schedule.schema';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/; // 'HH:mm'
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/; // 'YYYY-MM-DD'

/**
 * One event in a replace-events payload. Array position determines priority, so
 * there is no `order` field — the service assigns `order = index`.
 */
export class ScheduleEventDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  id?: string;

  @ApiProperty({ enum: ScheduleEventType })
  @IsEnum(ScheduleEventType)
  type!: ScheduleEventType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ enum: ScheduleContentType })
  @IsOptional()
  @IsEnum(ScheduleContentType)
  contentType?: ScheduleContentType;

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

  @ApiProperty({ enum: ScheduleRepeat })
  @IsEnum(ScheduleRepeat)
  repeat!: ScheduleRepeat;

  @ApiProperty({ example: '2026-06-24' })
  @Matches(DATE_PATTERN)
  startDate!: string;

  @ApiProperty({ example: '2026-06-24' })
  @Matches(DATE_PATTERN)
  endDate!: string;

  @ApiProperty({ example: '09:30' })
  @Matches(TIME_PATTERN)
  startTime!: string;

  @ApiProperty({ example: '10:00' })
  @Matches(TIME_PATTERN)
  endTime!: string;

  @ApiPropertyOptional({ type: [String], example: ['2026-06-25'] })
  @IsOptional()
  @IsArray()
  @Matches(DATE_PATTERN, { each: true })
  excludedDates?: string[];
}

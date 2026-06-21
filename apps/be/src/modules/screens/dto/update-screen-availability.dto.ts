import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsTimeZone,
  Matches,
  ValidateNested,
} from 'class-validator';

import {
  ScreenAvailabilityMode,
  WeekdayKey,
} from '../schemas/screen.schema';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/; // 'HH:mm'
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/; // 'YYYY-MM-DD'

export class WeeklyDayHoursDto {
  @ApiProperty({ enum: WeekdayKey })
  @IsEnum(WeekdayKey)
  day!: WeekdayKey;

  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;

  @ApiProperty({ example: '09:00' })
  @Matches(TIME_PATTERN)
  start!: string;

  @ApiProperty({ example: '17:00' })
  @Matches(TIME_PATTERN)
  end!: string;
}

export class SpecialWindowDto {
  @ApiProperty({ example: '2026-06-20' })
  @Matches(DATE_PATTERN)
  startDate!: string;

  @ApiProperty({ example: '2026-07-20' })
  @Matches(DATE_PATTERN)
  endDate!: string;

  @ApiProperty({ example: '09:00' })
  @Matches(TIME_PATTERN)
  start!: string;

  @ApiProperty({ example: '17:00' })
  @Matches(TIME_PATTERN)
  end!: string;
}

export class UpdateScreenAvailabilityDto {
  @ApiProperty({ enum: ScreenAvailabilityMode })
  @IsEnum(ScreenAvailabilityMode)
  mode!: ScreenAvailabilityMode;

  @ApiProperty({ example: 'Europe/Belgrade' })
  @IsTimeZone()
  timezone!: string;

  @ApiProperty({ type: [WeeklyDayHoursDto] })
  @IsArray()
  @ArrayMinSize(7)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => WeeklyDayHoursDto)
  weekly!: WeeklyDayHoursDto[];

  @ApiProperty({ type: SpecialWindowDto })
  @ValidateNested()
  @Type(() => SpecialWindowDto)
  special!: SpecialWindowDto;
}

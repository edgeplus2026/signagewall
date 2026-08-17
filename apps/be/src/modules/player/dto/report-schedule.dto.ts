import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';

import { ReportFrequency } from '../schemas/report-schedule.schema';

export class ReportScheduleDto {
  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;

  @ApiProperty({ enum: ReportFrequency })
  @IsIn(Object.values(ReportFrequency))
  frequency!: ReportFrequency;

  /**
   * Capped, because this is an unauthenticated fan-out: every address here gets
   * a document about somebody's business, and a list of two hundred is a
   * mailing list, not a report.
   */
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(20)
  @IsEmail({}, { each: true })
  recipients!: string[];

  @ApiPropertyOptional({ example: 'Europe/Belgrade' })
  @IsOptional()
  @IsString()
  timezone?: string;
}

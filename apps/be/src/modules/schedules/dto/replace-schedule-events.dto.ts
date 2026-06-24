import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsOptional,
  ValidateNested,
} from 'class-validator';

import { MAX_SCHEDULE_EVENTS } from '../schedule.validation';
import { ScheduleEventDto } from './schedule-event.dto';

export class ReplaceScheduleEventsDto {
  @ApiProperty({ type: [ScheduleEventDto] })
  @IsArray()
  @ArrayMaxSize(MAX_SCHEDULE_EVENTS)
  @ValidateNested({ each: true })
  @Type(() => ScheduleEventDto)
  events!: ScheduleEventDto[];

  /**
   * The `updatedAt` the client last observed. When provided, the write is
   * rejected with 409 if the schedule changed in the meantime (lost-update
   * protection for concurrent editors).
   */
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expectedUpdatedAt?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { ScheduleContentRefDto } from './schedule-content-ref.dto';

export class CreateScheduleDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ type: ScheduleContentRefDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ScheduleContentRefDto)
  filler?: ScheduleContentRefDto;
}

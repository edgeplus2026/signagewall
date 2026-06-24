import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import { ScheduleContentRefDto } from './schedule-content-ref.dto';

export class UpdateScheduleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  /** `null` clears the filler; an object sets it; omitted leaves it unchanged. */
  @ApiPropertyOptional({ type: ScheduleContentRefDto, nullable: true })
  @IsOptional()
  @ValidateIf((o: UpdateScheduleDto) => o.filler !== null)
  @ValidateNested()
  @Type(() => ScheduleContentRefDto)
  filler?: ScheduleContentRefDto | null;
}

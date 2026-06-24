import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsTimeZone } from 'class-validator';

/**
 * Query for the resolution endpoints. Provide `at` for a single-instant
 * resolution, or `from`+`to` for a window timeline. `tz` overrides the
 * timezone used to interpret wall-clock event times.
 */
export class ResolveQueryDto {
  @ApiPropertyOptional({ example: '2026-06-24T09:45:00.000Z' })
  @IsOptional()
  @IsDateString()
  at?: string;

  @ApiPropertyOptional({ example: '2026-06-22T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-06-29T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ example: 'Europe/Belgrade' })
  @IsOptional()
  @IsTimeZone()
  tz?: string;
}

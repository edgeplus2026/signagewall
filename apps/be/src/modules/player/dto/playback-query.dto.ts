import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsOptional, IsString, Matches } from 'class-validator';

/** Local calendar day, as the device stamps it. */
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export class CoverageQueryDto {
  @ApiProperty({ example: '2026-08-17' })
  @Matches(DAY, { message: 'day must be YYYY-MM-DD' })
  day!: string;

  /** Draw only this item — "where and when did my spot actually run". */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contentId?: string;
}

export class PlanQueryDto {
  @ApiProperty({ example: '2026-08-17' })
  @Matches(DAY, { message: 'day must be YYYY-MM-DD' })
  day!: string;
}

export class PlaybackItemsQueryDto {
  @ApiProperty({ example: '2026-08-01' })
  @Matches(DAY, { message: 'from must be YYYY-MM-DD' })
  from!: string;

  @ApiProperty({ example: '2026-08-17' })
  @Matches(DAY, { message: 'to must be YYYY-MM-DD' })
  to!: string;

  /**
   * Optional screen filter, comma-separated. A client with two locations asks
   * "what ran at THIS one", which is the whole reason the table carries screens.
   */
  @ApiPropertyOptional({ example: '66f0…,66f1…' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean)
      : value,
  )
  @IsArray()
  @IsString({ each: true })
  screenIds?: string[];
}

export class DaypartingQueryDto extends PlaybackItemsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contentId?: string;
}

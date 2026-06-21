import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsMongoId, IsOptional, Max, Min } from 'class-validator';

export class UploadMediaBodyDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsMongoId()
  parentId?: string | null;

  @ApiPropertyOptional({
    description: 'Video duration in seconds, captured client-side on upload.',
    example: 42,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3600)
  duration?: number;
}

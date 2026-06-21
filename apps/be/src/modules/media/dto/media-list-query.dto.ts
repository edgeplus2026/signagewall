import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class MediaListQueryDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsMongoId()
  parentId?: string | null;

  @ApiPropertyOptional({ description: 'When true, return folders only' })
  @IsOptional()
  @IsString()
  foldersOnly?: string;

  @ApiPropertyOptional({
    description: 'When true, return items across the entire organization',
  })
  @IsOptional()
  @IsString()
  all?: string;
}

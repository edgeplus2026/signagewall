import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DuplicatePlaylistDto {
  @ApiPropertyOptional({ example: ' (copy)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  copySuffix?: string;
}

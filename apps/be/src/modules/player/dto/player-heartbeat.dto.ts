import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class PlayerHeartbeatDto {
  @ApiPropertyOptional({
    description: 'Id of the renderable currently on screen',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  playingItemId?: string;

  @ApiPropertyOptional({
    description: 'Content revision the device is currently on',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  revision?: string;

  @ApiPropertyOptional({ description: 'Most recent client-side error, if any' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  lastError?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  screenWidth?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  screenHeight?: number;
}

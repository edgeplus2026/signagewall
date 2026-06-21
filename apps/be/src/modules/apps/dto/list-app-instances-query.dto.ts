import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ListAppInstancesQueryDto {
  @ApiPropertyOptional({ description: 'Filter instances by catalog app id.' })
  @IsOptional()
  @IsString()
  appId?: string;
}

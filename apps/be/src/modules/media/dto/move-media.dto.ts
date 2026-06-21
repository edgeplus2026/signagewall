import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsMongoId,
  IsOptional,
} from 'class-validator';

export class MoveMediaDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsMongoId({ each: true })
  ids!: string[];

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsMongoId()
  targetFolderId?: string | null;
}

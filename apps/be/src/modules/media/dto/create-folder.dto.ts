import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateFolderDto {
  @ApiProperty({ example: 'Promotions' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ nullable: true, example: null })
  @IsOptional()
  @IsMongoId()
  parentId?: string | null;
}

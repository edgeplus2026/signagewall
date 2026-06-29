import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Creates a catalog category. The slug is derived from the name server-side. */
export class CreateAppCategoryDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional({
    description: 'Display order in the catalog (ascending).',
  })
  @IsOptional()
  @IsInt()
  order?: number;
}

import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsMongoId } from 'class-validator';

export class AssignScreensDto {
  /** The complete set of screens this schedule should be assigned to (empty = none). */
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(1000)
  @IsMongoId({ each: true })
  screenIds!: string[];
}

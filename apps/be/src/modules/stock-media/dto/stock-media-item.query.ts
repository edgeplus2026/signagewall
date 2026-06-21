import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

import { StockMediaItemType } from '../stock-media.constants';

export class StockMediaItemQueryDto {
  @ApiProperty({ enum: StockMediaItemType })
  @IsEnum(StockMediaItemType)
  mediaType!: StockMediaItemType;
}

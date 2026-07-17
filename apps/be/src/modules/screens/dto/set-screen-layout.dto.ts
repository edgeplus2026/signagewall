import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

import { ScreenLayout } from '../schemas/screen.schema';

/**
 * Sets a screen's split-screen layout preset. Zone rotations are edited through
 * the items endpoint (`PUT :id/items` with a `zone`); switching presets never
 * deletes a zone's items, so flipping back loses nothing.
 */
export class SetScreenLayoutDto {
  @ApiProperty({ enum: ScreenLayout })
  @IsEnum(ScreenLayout)
  layout!: ScreenLayout;
}

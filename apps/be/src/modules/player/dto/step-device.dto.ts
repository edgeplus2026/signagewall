import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

/** Which way to step the live player through its content. */
export type StepDirection = 'next' | 'prev';

export class StepDeviceDto {
  @ApiProperty({
    enum: ['next', 'prev'],
    example: 'next',
    description: 'Step the player to the next or previous content item.',
  })
  @IsIn(['next', 'prev'])
  direction!: StepDirection;
}

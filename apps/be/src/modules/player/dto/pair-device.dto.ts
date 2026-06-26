import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class PairDeviceDto {
  @ApiProperty({
    example: 'ABC-D29',
    description: 'Pairing code shown on the display',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  code!: string;
}

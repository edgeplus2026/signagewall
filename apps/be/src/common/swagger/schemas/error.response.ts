import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiErrorSchema {
  @ApiProperty({ example: 'VALIDATION_ERROR' })
  code: string;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional({ type: [String] })
  details?: string[];
}

export class ApiErrorEnvelopeSchema {
  @ApiProperty({ enum: [false] })
  success: false;

  @ApiProperty({ type: ApiErrorSchema })
  error: ApiErrorSchema;

  @ApiProperty()
  path: string;

  @ApiProperty({ format: 'date-time' })
  timestamp: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AiGenerationJobSchema {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ['queued', 'processing', 'succeeded', 'failed'] })
  status: 'queued' | 'processing' | 'succeeded' | 'failed';

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'The multi-step form inputs the user entered.',
  })
  input: Record<string, unknown>;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    nullable: true,
    description: 'Validated generated content; present once the job succeeds.',
  })
  result?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  error?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Id of the draft playlist created from this generation.',
  })
  playlistId?: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;
}

export class AiGenerationPlaylistSchema {
  @ApiProperty({ description: 'Id of the created draft playlist.' })
  playlistId: string;
}

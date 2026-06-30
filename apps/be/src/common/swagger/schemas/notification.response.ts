import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// --- User-facing (inbox) -----------------------------------------------------

export class NotificationResponseSchema {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    nullable: true,
    description: 'Tiptap document JSON.',
  })
  content: Record<string, unknown> | null;

  @ApiProperty()
  read: boolean;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  readAt: string | null;

  @ApiProperty({ format: 'date-time' })
  publishedAt: string;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;
}

export class PaginatedNotificationsSchema {
  @ApiProperty({ type: [NotificationResponseSchema] })
  items: NotificationResponseSchema[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class UnreadCountSchema {
  @ApiProperty()
  count: number;
}

// --- Admin (authoring) -------------------------------------------------------

export class AdminNotificationTranslationSchema {
  @ApiProperty()
  title: string;

  @ApiProperty({ type: 'object', additionalProperties: true, nullable: true })
  content: Record<string, unknown> | null;
}

export class AdminNotificationTranslationsSchema {
  @ApiProperty({ type: AdminNotificationTranslationSchema })
  en: AdminNotificationTranslationSchema;

  @ApiProperty({ type: AdminNotificationTranslationSchema })
  sr: AdminNotificationTranslationSchema;
}

export class AdminNotificationAudienceSchema {
  @ApiProperty({ enum: ['all', 'orgs', 'users'] })
  type: 'all' | 'orgs' | 'users';

  @ApiPropertyOptional({ type: [String] })
  ids?: string[];
}

export class AdminNotificationResponseSchema {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: AdminNotificationTranslationsSchema })
  translations: AdminNotificationTranslationsSchema;

  @ApiProperty({ enum: ['draft', 'published'] })
  status: 'draft' | 'published';

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  publishedAt: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  expiresAt: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  scheduledAt: string | null;

  @ApiProperty({ type: AdminNotificationAudienceSchema })
  audience: AdminNotificationAudienceSchema;

  @ApiProperty()
  createdBy: string;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt: string;
}

export class PaginatedAdminNotificationsSchema {
  @ApiProperty({ type: [AdminNotificationResponseSchema] })
  items: AdminNotificationResponseSchema[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

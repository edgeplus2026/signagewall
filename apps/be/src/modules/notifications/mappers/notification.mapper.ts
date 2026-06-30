import { Types } from 'mongoose';

import {
  NotificationAudienceType,
  NotificationDocument,
  NotificationKind,
  NotificationStatus,
  RichTextContent,
} from '../schemas/notification.schema';

export type NotificationLang = 'en' | 'sr';

export interface AdminNotificationTranslationDto {
  title: string;
  content: RichTextContent | null;
}

export interface AdminNotificationDto {
  id: string;
  translations: {
    en: AdminNotificationTranslationDto;
    sr: AdminNotificationTranslationDto;
  };
  status: NotificationStatus;
  publishedAt: string | null;
  expiresAt: string | null;
  scheduledAt: string | null;
  audience: { type: NotificationAudienceType; ids?: string[] };
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserNotificationDto {
  id: string;
  kind: NotificationKind;
  title: string;
  content: RichTextContent | null;
  read: boolean;
  readAt: string | null;
  publishedAt: string;
  createdAt: string;
}

/**
 * Lean row produced by the visible-notifications aggregation: the stored
 * document plus the per-user `read`/`readAt` fields joined from receipts.
 */
export interface VisibleNotificationRow {
  _id: Types.ObjectId;
  kind?: NotificationKind;
  translations: {
    en?: AdminNotificationTranslationDto;
    sr?: AdminNotificationTranslationDto;
  };
  publishedAt: Date;
  createdAt: Date;
  read: boolean;
  readAt: Date | null;
}

const normalizeLang = (lang: string | undefined): NotificationLang =>
  lang === 'sr' ? 'sr' : 'en';

const isMeaningfulString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

/** Picks the requested language, falling back to `en` per field when empty. */
const resolveTitle = (
  translations: VisibleNotificationRow['translations'],
  lang: NotificationLang,
): string => {
  const preferred = translations[lang]?.title;
  if (isMeaningfulString(preferred)) {
    return preferred;
  }
  return translations.en?.title ?? '';
};

const resolveContent = (
  translations: VisibleNotificationRow['translations'],
  lang: NotificationLang,
): RichTextContent | null => {
  const preferred = translations[lang]?.content;
  if (preferred != null) {
    return preferred;
  }
  return translations.en?.content ?? null;
};

export const toAdminNotificationDto = (
  doc: NotificationDocument,
): AdminNotificationDto => ({
  id: doc._id.toString(),
  translations: {
    en: {
      title: doc.translations.en?.title ?? '',
      content: doc.translations.en?.content ?? null,
    },
    sr: {
      title: doc.translations.sr?.title ?? '',
      content: doc.translations.sr?.content ?? null,
    },
  },
  status: doc.status,
  publishedAt: doc.publishedAt ? doc.publishedAt.toISOString() : null,
  expiresAt: doc.expiresAt ? doc.expiresAt.toISOString() : null,
  scheduledAt: doc.scheduledAt ? doc.scheduledAt.toISOString() : null,
  audience: {
    type: doc.audience?.type ?? 'all',
    ...(doc.audience?.ids ? { ids: doc.audience.ids } : {}),
  },
  createdBy: doc.createdBy ? doc.createdBy.toString() : null,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
});

export const toUserNotificationDto = (
  row: VisibleNotificationRow,
  lang: string | undefined,
): UserNotificationDto => {
  const resolved = normalizeLang(lang);
  return {
    id: row._id.toString(),
    kind: row.kind ?? 'broadcast',
    title: resolveTitle(row.translations, resolved),
    content: resolveContent(row.translations, resolved),
    read: row.read,
    readAt: row.readAt ? row.readAt.toISOString() : null,
    publishedAt: row.publishedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
};

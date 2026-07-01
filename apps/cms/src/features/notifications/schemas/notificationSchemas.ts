import type { TFunction } from 'i18next'
import { z } from 'zod'

import { tiptapToPlainText } from '@/features/notifications/lib/tiptapText'
import type { RichTextContent } from '@/features/notifications/types/notification.types'

const isRichText = (value: unknown): value is RichTextContent =>
  typeof value === 'object' && value !== null

const hasText = (value: RichTextContent) =>
  tiptapToPlainText(value, 100_000).length > 0

/**
 * Title + content are required in EVERY language (English and Serbian): a
 * notification can't be saved until both are filled. Content is validated by
 * deriving plain text from the Tiptap JSON so an empty document fails the
 * "required" check.
 */
export function createNotificationFormSchema(t: TFunction) {
  return z.object({
    titleEn: z
      .string()
      .trim()
      .min(1, t('notifications.form.titleRequired'))
      .max(200, t('notifications.form.titleTooLong')),
    contentEn: z
      .custom<RichTextContent>(isRichText)
      .refine(hasText, { message: t('notifications.form.contentRequired') }),
    titleSr: z
      .string()
      .trim()
      .min(1, t('notifications.form.titleRequired'))
      .max(200, t('notifications.form.titleTooLong')),
    contentSr: z
      .custom<RichTextContent>(isRichText)
      .refine(hasText, { message: t('notifications.form.contentRequired') }),
    expiresAt: z.string(),
  })
}

export type NotificationFormValues = z.infer<
  ReturnType<typeof createNotificationFormSchema>
>

import type { TFunction } from "i18next"

import {
  ALLOWED_MEDIA_MIME_TYPES,
  formatMaxFileSize,
  MEDIA_MAX_FILE_SIZE_BYTES,
  MEDIA_MAX_FILES_PER_UPLOAD,
} from "@/features/media/lib/media.constants"
import type { StagedItem } from "@/features/media/store/stagingStore"

export interface StagedValidation {
  /** Per-item error message, keyed by staged item id. */
  errorById: Record<string, string>
  /** Batch-level errors not tied to a single item (e.g. count overflow). */
  batchErrors: string[]
  /** Items that pass every check — the ones the Upload action will commit. */
  validItems: StagedItem[]
}

/**
 * Validates the unified staging batch (local files + cloud picks) against the
 * same MIME/size/count limits as device uploads, reusing the existing
 * `media.upload.validation.*` messages. The count limit applies to the whole
 * batch combined.
 */
export function validateStagedItems(
  items: StagedItem[],
  t: TFunction,
): StagedValidation {
  const errorById: Record<string, string> = {}
  const batchErrors: string[] = []

  if (items.length > MEDIA_MAX_FILES_PER_UPLOAD) {
    batchErrors.push(
      t("media.upload.validation.maxFiles", {
        count: MEDIA_MAX_FILES_PER_UPLOAD,
      }),
    )
  }

  for (const item of items) {
    if (
      !ALLOWED_MEDIA_MIME_TYPES.includes(
        item.mimeType as (typeof ALLOWED_MEDIA_MIME_TYPES)[number],
      )
    ) {
      errorById[item.id] = t("media.upload.validation.invalidType", {
        name: item.name,
      })
      continue
    }

    if (item.sizeBytes > MEDIA_MAX_FILE_SIZE_BYTES) {
      errorById[item.id] = t("media.upload.validation.tooLarge", {
        name: item.name,
        size: formatMaxFileSize(),
      })
    }
  }

  const overflow = batchErrors.length > 0
  const validItems = overflow
    ? []
    : items.filter((item) => !errorById[item.id])

  return { errorById, batchErrors, validItems }
}

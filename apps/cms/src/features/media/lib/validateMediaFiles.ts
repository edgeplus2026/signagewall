import type { TFunction } from 'i18next'

import {
  ALLOWED_MEDIA_MIME_TYPES,
  formatMaxFileSize,
  MEDIA_MAX_FILE_SIZE_BYTES,
  MEDIA_MAX_FILES_PER_UPLOAD,
} from '@/features/media/lib/media.constants'

export interface MediaFileValidationResult {
  validFiles: File[]
  errors: string[]
}

export function validateMediaFiles(
  files: File[],
  t: TFunction,
): MediaFileValidationResult {
  const errors: string[] = []

  if (files.length === 0) {
    return { validFiles: [], errors }
  }

  if (files.length > MEDIA_MAX_FILES_PER_UPLOAD) {
    errors.push(
      t('media.upload.validation.maxFiles', { count: MEDIA_MAX_FILES_PER_UPLOAD }),
    )
    return { validFiles: [], errors }
  }

  const validFiles: File[] = []

  for (const file of files) {
    if (
      !ALLOWED_MEDIA_MIME_TYPES.includes(
        file.type as (typeof ALLOWED_MEDIA_MIME_TYPES)[number],
      )
    ) {
      errors.push(t('media.upload.validation.invalidType', { name: file.name }))
      continue
    }

    if (file.size > MEDIA_MAX_FILE_SIZE_BYTES) {
      errors.push(
        t('media.upload.validation.tooLarge', {
          name: file.name,
          size: formatMaxFileSize(),
        }),
      )
      continue
    }

    validFiles.push(file)
  }

  return { validFiles, errors }
}

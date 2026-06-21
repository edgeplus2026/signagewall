import { UploadCloudIcon } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  mediaActionCardClassName,
  mediaActionCardIconClassName,
} from '@/features/media/lib/mediaActionCardStyles'
import { cn } from '@/lib/utils'

interface MediaUploadZoneProps {
  disabled?: boolean
  onFilesSelected: (files: File[]) => void
}

export function MediaUploadZone({ disabled, onFilesSelected }: MediaUploadZoneProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return

      const files = Array.from(fileList).filter(
        (file) => file.type.startsWith('image/') || file.type.startsWith('video/'),
      )

      if (files.length > 0) {
        onFilesSelected(files)
      }
    },
    [onFilesSelected],
  )

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!disabled) inputRef.current?.click()
      }}
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) setIsDragging(true)
      }}
      onDragLeave={() => {
        setIsDragging(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setIsDragging(false)
        if (!disabled) handleFiles(event.dataTransfer.files)
      }}
      className={cn(
        mediaActionCardClassName,
        'border-secondary bg-panel/50 border border-dashed',
        'hover:border-brand/50 hover:bg-highlight/30',
        isDragging && 'border-brand bg-brand/5',
      )}
    >
      <div className="flex shrink-0 items-center gap-1">
        <div className={mediaActionCardIconClassName}>
          <UploadCloudIcon className="size-4" />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-primary truncate text-sm font-medium">
          {t('media.dropzone.upload.title')}
        </p>
        <p className="text-secondary line-clamp-2 text-xs">{t('media.dropzone.upload.hint')}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        className="sr-only"
        onChange={(event) => {
          handleFiles(event.target.files)
          event.target.value = ''
        }}
      />
    </button>
  )
}

import { ImageIcon, Loader2Icon, UploadCloudIcon, XIcon } from 'lucide-react'
import { useId, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ImageUploaderProps {
  /** Current image value — a URL or data URL. Empty string when unset. */
  value: string
  onChange: (value: string) => void
  onBlur?: (() => void) | undefined
  id?: string | undefined
  disabled?: boolean | undefined
  /** Max file size in MB before rejecting. */
  maxSizeMb?: number | undefined
  /**
   * Optional uploader. When provided, the selected file is uploaded and the
   * returned (hosted) URL is stored. When absent, a local data URL is used.
   */
  onUpload?: ((file: File) => Promise<string>) | undefined
  'aria-invalid'?: boolean | undefined
  labels?:
    | {
        cta?: string
        hint?: string
        remove?: string
        tooLarge?: string
        uploadError?: string
      }
    | undefined
  className?: string | undefined
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '')
    }
    reader.onerror = () => {
      reject(new Error('read-failed'))
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Self-contained image input: click/drop a file (read to a data URL) with a
 * live preview. Produces a string value, so it can later be swapped to upload
 * to R2 and store a URL without changing its consumers.
 */
export function ImageUploader({
  value,
  onChange,
  onBlur,
  id,
  disabled,
  maxSizeMb = 5,
  onUpload,
  'aria-invalid': ariaInvalid,
  labels,
  className,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const fallbackId = useId()
  const inputId = id ?? fallbackId
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(labels?.tooLarge ?? `Image must be under ${String(maxSizeMb)}MB.`)
      return
    }
    setError(null)
    try {
      if (onUpload) {
        setUploading(true)
        onChange(await onUpload(file))
      } else {
        onChange(await readAsDataUrl(file))
      }
    } catch {
      setError(labels?.uploadError ?? 'Could not upload the image.')
    } finally {
      setUploading(false)
    }
  }

  if (value) {
    return (
      <div className={cn('relative overflow-hidden rounded-lg ring-1 ring-quaternary', className)}>
        <img src={value} alt="" className="aspect-video w-full bg-sidebar/50 object-contain" />
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={disabled}
          aria-label={labels?.remove ?? 'Remove image'}
          onClick={() => {
            onChange('')
            setError(null)
          }}
          className="absolute top-2 right-2 bg-panel/80 backdrop-blur"
        >
          <XIcon />
        </Button>
      </div>
    )
  }

  return (
    <div className={className}>
      <button
        type="button"
        id={inputId}
        disabled={(disabled ?? false) || uploading}
        aria-invalid={ariaInvalid}
        aria-busy={uploading}
        onClick={() => {
          inputRef.current?.click()
        }}
        onBlur={onBlur}
        onDragOver={(event) => {
          event.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => {
          setDragOver(false)
        }}
        onDrop={(event) => {
          event.preventDefault()
          setDragOver(false)
          void handleFile(event.dataTransfer.files[0])
        }}
        className={cn(
          'group flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-panel/50 px-4 text-center transition-colors',
          dragOver ? 'border-brand bg-brand/5' : 'border-secondary hover:border-brand/50',
          'aria-invalid:border-danger disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        <div className="flex size-10 items-center justify-center rounded-lg bg-sidebar/60 text-secondary transition-colors group-hover:text-brand">
          {uploading ? (
            <Loader2Icon className="size-5 animate-spin" />
          ) : dragOver ? (
            <UploadCloudIcon className="size-5" />
          ) : (
            <ImageIcon className="size-5" />
          )}
        </div>
        <p className="text-sm font-medium text-primary">
          {uploading ? 'Uploading…' : (labels?.cta ?? 'Upload an image')}
        </p>
        {labels?.hint ? <p className="text-xs text-secondary">{labels.hint}</p> : null}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          void handleFile(event.target.files?.[0])
          event.target.value = ''
        }}
      />

      {error ? <p className="mt-1.5 text-sm text-danger">{error}</p> : null}
    </div>
  )
}

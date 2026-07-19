import { FileTextIcon, UploadCloudIcon, XIcon } from 'lucide-react'
import { useId, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FileUploaderProps {
  /** Current value — a `data:` URL of the uploaded file. Empty string when unset. */
  value: string
  onChange: (value: string) => void
  onBlur?: (() => void) | undefined
  id?: string | undefined
  disabled?: boolean | undefined
  /** Accepted file types as an `<input accept>` value (e.g. `'application/pdf'`). */
  accept?: string | undefined
  /** Max file size in MB before rejecting. */
  maxSizeMb?: number | undefined
  'aria-invalid'?: boolean | undefined
  labels?:
    | {
        cta?: string
        hint?: string
        remove?: string
        tooLarge?: string
        wrongType?: string
        readError?: string
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
 * True when `file` satisfies an `<input accept>` string. The native `accept`
 * attribute only filters the picker dialog — a drag-and-dropped file bypasses
 * it — so we re-check here. Supports a comma-separated list of MIME types
 * (`application/pdf`), MIME wildcards (`image/*`) and extensions (`.pdf`).
 */
function matchesAccept(file: File, accept: string | undefined): boolean {
  if (!accept) return true
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()
  return accept.split(',').some((raw) => {
    const token = raw.trim().toLowerCase()
    if (token === '') return false
    if (token.startsWith('.')) return name.endsWith(token)
    if (token.endsWith('/*')) return type.startsWith(token.slice(0, -1))
    return type === token
  })
}

/** Rough byte size of a base64 `data:` URL, for a human-readable chip label. */
function dataUrlSizeLabel(dataUrl: string): string {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  const bytes = Math.max(0, Math.floor((base64.length * 3) / 4) - padding)
  if (bytes < 1024) return `${String(bytes)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Self-contained file input: click or drop a file, read to a `data:` URL, and
 * store that string as the value. A sibling of {@link ImageUploader} for
 * non-image files (e.g. PDFs) — it shows a file chip instead of an image
 * preview, since the value can't be previewed as a picture.
 */
export function FileUploader({
  value,
  onChange,
  onBlur,
  id,
  disabled,
  accept,
  maxSizeMb = 10,
  'aria-invalid': ariaInvalid,
  labels,
  className,
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const fallbackId = useId()
  const inputId = id ?? fallbackId
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  // The picked file's name, kept only for display. Lost on reload (the value is
  // just a data URL) — we fall back to a generic label then.
  const [fileName, setFileName] = useState<string | null>(null)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    if (!matchesAccept(file, accept)) {
      setError(labels?.wrongType ?? 'That file type is not supported.')
      return
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(labels?.tooLarge ?? `File must be under ${String(maxSizeMb)}MB.`)
      return
    }
    setError(null)
    try {
      const dataUrl = await readAsDataUrl(file)
      setFileName(file.name)
      onChange(dataUrl)
    } catch {
      setError(labels?.readError ?? 'Could not read the file.')
    }
  }

  if (value) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 rounded-lg border border-quaternary bg-panel/50 p-3',
          className,
        )}
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sidebar/60 text-brand">
          <FileTextIcon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-primary">{fileName ?? 'Uploaded file'}</p>
          <p className="text-xs text-secondary">{dataUrlSizeLabel(value)}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={disabled}
          aria-label={labels?.remove ?? 'Remove file'}
          onClick={() => {
            onChange('')
            setFileName(null)
            setError(null)
          }}
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
        disabled={disabled ?? false}
        aria-invalid={ariaInvalid}
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
          {dragOver ? <UploadCloudIcon className="size-5" /> : <FileTextIcon className="size-5" />}
        </div>
        <p className="text-sm font-medium text-primary">{labels?.cta ?? 'Upload a file'}</p>
        {labels?.hint ? <p className="text-xs text-secondary">{labels.hint}</p> : null}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
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

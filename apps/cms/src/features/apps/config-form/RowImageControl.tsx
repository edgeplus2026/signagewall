import { ImageIcon } from 'lucide-react'
import { useState } from 'react'

import { ImageUploader } from '@/components/ui/image-uploader'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { FieldControlProps } from '@/features/apps/config-form/controls'
import {
  pollMediaUntilReady,
  uploadMediaFile,
} from '@/features/media/lib/uploadMediaFile'

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/**
 * Upload a repeater-row image through the media pipeline (sharp → WebP → R2)
 * and store the hosted URL. Deliberately NOT the inline-base64 path the
 * top-level `image` config field still uses: a list of rows each carrying a
 * base64 photo would put megabytes into the instance config, which rides in
 * every content snapshot pushed to players.
 */
async function uploadRowImage(file: File): Promise<string> {
  const item = await uploadMediaFile({ file, parentId: null })
  const ready = item.status === 'ready' ? item : await pollMediaUntilReady(item.id)
  if (!ready.fileUrl) throw new Error('upload-missing-url')
  return ready.fileUrl
}

/**
 * The compact `image` control for repeater rows: a thumbnail cell that opens a
 * popover with the full uploader. A full dropzone per row would dwarf the row.
 */
export function RowImageControl({ id, value, onChange, onBlur, disabled }: FieldControlProps) {
  const [open, setOpen] = useState(false)
  const url = asString(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-label="Photo"
          className="border-quaternary bg-panel hover:border-brand/50 flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border disabled:opacity-50"
        >
          {url ? (
            <img src={url} alt="" className="size-full object-cover" />
          ) : (
            <ImageIcon className="text-secondary size-4" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        <ImageUploader
          value={url}
          disabled={disabled}
          onUpload={uploadRowImage}
          onChange={(next) => {
            onChange(next)
            if (!next) setOpen(false)
          }}
          onBlur={onBlur}
        />
      </PopoverContent>
    </Popover>
  )
}

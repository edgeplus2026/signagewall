import { FileIcon, FolderOpenIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { useConfigValues } from '@/features/apps/config-form/configValuesContext'
import type { FieldControlProps } from '@/features/apps/config-form/controls'
import { openGoogleFilePicker } from '@/features/apps/config-form/googleFilePicker'
import { CloudPickerError } from '@/features/media/cloud/lib/cloudPickerError'

interface PickedValue {
  id: string
  label?: string
}

/** The stored value as { id, label }, tolerating a bare id string. */
function asValue(value: unknown): PickedValue | null {
  if (value && typeof value === 'object' && 'id' in value) {
    return value as PickedValue
  }
  return typeof value === 'string' && value ? { id: value } : null
}

/**
 * A `remote-select` field that opted into `picker: 'google-drive'`: the file is
 * chosen in Google's own picker instead of a dropdown the backend fills in.
 *
 * It stores the identical `{ id, label }` value the combobox stored, so
 * connectors, validation and every already-saved instance are unaffected — the
 * only thing that changed is where the id comes from, and therefore which scope
 * the app has to ask Google for.
 *
 * Gated on the sibling `connectionId` for one non-obvious reason: picking grants
 * file access to the OAuth client, but reading it later needs a connection whose
 * token belongs to that same client. Letting someone pick before connecting
 * would look like it worked and produce an instance that renders nothing.
 */
export function GooglePickerControl({
  field,
  id,
  value,
  onChange,
  onBlur,
  invalid,
  disabled,
}: FieldControlProps) {
  const { t } = useTranslation()
  const values = useConfigValues()
  const connectionId =
    typeof values.connectionId === 'string' ? values.connectionId : undefined
  const source = field.remoteSource ?? ''

  const [busy, setBusy] = useState(false)
  const selected = asValue(value)
  const unavailable = (disabled ?? false) || !connectionId || busy

  const pick = () => {
    setBusy(true)
    openGoogleFilePicker(source)
      .then((file) => {
        onChange({ id: file.id, label: file.label })
      })
      .catch((error: unknown) => {
        // Closing the picker is a decision, not a failure — say nothing.
        if (error instanceof CloudPickerError && error.code === 'cancelled') {
          return
        }
        toast.error(t('apps.googlePicker.failed'))
      })
      .finally(() => {
        setBusy(false)
        onBlur()
      })
  }

  return (
    <div className="flex flex-col gap-1.5" id={id} aria-invalid={invalid}>
      {selected ? (
        <div className="border-quaternary flex items-center justify-between gap-2 rounded-md border px-3 py-2">
          <span className="flex min-w-0 items-center gap-2">
            <FileIcon className="size-4 shrink-0" />
            {/* The id is the fallback because a file picked before this control
                existed has no stored label, and an empty row reads as "nothing
                selected" when something very much is. */}
            <span className="truncate text-sm">{selected.label ?? selected.id}</span>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={unavailable}
            onClick={pick}
          >
            {t('apps.googlePicker.change')}
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full gap-1.5"
          disabled={unavailable}
          onClick={pick}
        >
          <FolderOpenIcon className="size-4" />
          {t('apps.googlePicker.choose')}
        </Button>
      )}
      {!connectionId && (
        <p className="text-tertiary text-xs">
          {t('apps.connections.selectAccountFirst')}
        </p>
      )}
    </div>
  )
}

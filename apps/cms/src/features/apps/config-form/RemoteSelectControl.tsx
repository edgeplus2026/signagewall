import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { useConfigValues } from '@/features/apps/config-form/configValuesContext'
import type { FieldControlProps } from '@/features/apps/config-form/controls'
import { useCanvaDesigns } from '@/features/apps/hooks/useConnections'
import { useDebouncedValue } from '@/features/media/stock/hooks/useDebouncedValue'

interface RemoteSelectValue {
  id: string
  label?: string
}

/** The stored value as { id, label }, tolerating a bare id string. */
function asValue(value: unknown): RemoteSelectValue | null {
  if (value && typeof value === 'object' && 'id' in value) {
    return value as RemoteSelectValue
  }
  return typeof value === 'string' && value ? { id: value } : null
}

/**
 * The `remote-select` field control: an async, searchable dropdown backed by a
 * connected account. Reads the sibling `connectionId` (from the form context) to
 * know which connection to query, debounces the search term, and stores the
 * chosen resource as `{ id, label }` so the selection shows without a re-fetch.
 *
 * Currently wired to `remoteSource: 'canva-designs'` (the only source today).
 */
export function RemoteSelectControl({
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

  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 300)

  const { data: designs = [], isFetching } = useCanvaDesigns(
    connectionId,
    debouncedQuery,
  )

  const selected = asValue(value)
  const options: ComboboxOption[] = designs.map((design) => ({
    value: design.id,
    label: design.title,
  }))

  const noConnection = !connectionId

  return (
    <Combobox
      id={id}
      value={selected?.id ?? ''}
      selectedLabel={selected?.label}
      options={options}
      onSearch={setQuery}
      loading={isFetching}
      onChange={(nextId) => {
        const picked = designs.find((design) => design.id === nextId)
        onChange({ id: nextId, label: picked?.title ?? selected?.label })
      }}
      onBlur={onBlur}
      disabled={(disabled ?? false) || noConnection}
      placeholder={
        noConnection
          ? t('apps.connections.selectAccountFirst')
          : (field.placeholder ?? t('apps.remoteSelect.placeholder'))
      }
      searchPlaceholder={t('apps.remoteSelect.search')}
      emptyLabel={t('apps.remoteSelect.empty')}
      aria-invalid={invalid}
    />
  )
}

import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { connectionsApi } from '@/features/apps/api/connectionsApi'
import { useConfigValues } from '@/features/apps/config-form/configValuesContext'
import type { FieldControlProps } from '@/features/apps/config-form/controls'
import { ColumnMappingEditor } from '@/features/apps/config-form/tabular/ColumnMappingEditor'
import { autoMap } from '@/features/apps/config-form/tabular/csv'

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/**
 * The `column-mapping` field control: reads its context (connection, source
 * kind, picked file, worksheet) from sibling fields per the field's
 * `columnMapping` spec, fetches the sheet's header row from the backend, and
 * lets the operator assign a column to each target item field. Auto-maps by
 * header name the first time headers arrive so the common case ("Name, Price,
 * Description" headers) needs no clicking.
 */
export function ColumnMappingControl({
  field,
  value,
  onChange,
  disabled,
}: FieldControlProps) {
  const { t } = useTranslation()
  const spec = field.columnMapping
  const values = useConfigValues()

  const connectionId = str(values[spec?.connectionKey ?? ''])
  const source = str(values[spec?.sourceKey ?? ''])
  const fileKey = spec?.fileKeyBySource[source]
  const file = fileKey !== undefined ? values[fileKey] : undefined
  const fileId =
    typeof file === 'object' && file !== null ? str((file as { id?: unknown }).id) : ''
  const worksheet = spec?.worksheetKey !== undefined ? str(values[spec.worksheetKey]) : ''

  const headersQuery = useQuery({
    queryKey: ['tabular-headers', connectionId, source, fileId, worksheet],
    queryFn: () => connectionsApi.fetchTabularHeaders(connectionId, source, fileId, worksheet),
    enabled: connectionId !== '' && fileId !== '' && source !== '',
    staleTime: 30_000,
    retry: 1,
  })

  const mapping =
    typeof value === 'object' && value !== null ? (value as Record<string, string>) : {}
  const headers = headersQuery.data

  // First headers for an unmapped field: fill the obvious matches once. Never
  // re-runs over an operator's explicit choices (mapping non-empty).
  useEffect(() => {
    if (!spec || !headers || headers.length === 0) return
    if (Object.keys(mapping).length > 0) return
    const guessed = autoMap(headers, spec.targets)
    if (Object.keys(guessed).length > 0) onChange(guessed)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run per headers arrival
  }, [headers])

  if (!spec) return null

  if (connectionId === '' || fileId === '') {
    return <p className="text-sm text-secondary">{t('apps.tabular.mapping.pickFileFirst')}</p>
  }
  if (headersQuery.isLoading) {
    return <p className="text-sm text-secondary">{t('apps.tabular.mapping.loading')}</p>
  }
  if (headersQuery.isError || !headers) {
    return <p className="text-sm text-danger">{t('apps.tabular.mapping.loadError')}</p>
  }

  return (
    <ColumnMappingEditor
      headers={headers}
      targets={spec.targets}
      value={mapping}
      onChange={onChange}
      disabled={disabled}
    />
  )
}

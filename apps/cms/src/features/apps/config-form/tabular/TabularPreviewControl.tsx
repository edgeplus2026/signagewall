import type { AppDataMeta } from '@signagewall/apps-contract'
import { useQuery } from '@tanstack/react-query'
import { PencilIcon, RefreshCwIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { appsApi } from '@/features/apps/api/appsApi'
import { useAppSlug } from '@/features/apps/config-form/appSlugContext'
import { useConfigPatch } from '@/features/apps/config-form/configPatchContext'
import { useConfigValues } from '@/features/apps/config-form/configValuesContext'
import type { FieldControlProps } from '@/features/apps/config-form/controls'
import { useDebouncedValue } from '@/features/media/stock/hooks/useDebouncedValue'

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

type SyncedRow = Record<string, unknown>;

/**
 * The `tabular-preview` field control: a read-only table of the rows the
 * tabular sync currently produces (via the app's preview-data endpoint — the
 * same connector fetch real screens use, so what you see is what plays), with
 * freshness and a "convert to manual" action that copies the rows into the
 * manual repeater and flips the source select. While synced, the sheet is the
 * source of truth; editing happens there — or here, after unlinking.
 */
export function TabularPreviewControl({ field, disabled }: FieldControlProps) {
  const { t } = useTranslation()
  const spec = field.columnMapping
  const appSlug = useAppSlug()
  const values = useConfigValues()
  const patchConfig = useConfigPatch()

  const connectionId = str(values[spec?.connectionKey ?? ''])
  const source = str(values[spec?.sourceKey ?? ''])
  const fileKey = spec?.fileKeyBySource[source]
  const file = fileKey !== undefined ? values[fileKey] : undefined
  const fileId =
    typeof file === 'object' && file !== null ? str((file as { id?: unknown }).id) : ''
  const mapping = values.mapping
  const hasMapping =
    typeof mapping === 'object' && mapping !== null && Object.keys(mapping).length > 0

  // Debounced like the live preview: mapping/worksheet edits shouldn't fire a
  // connector fetch per click.
  const debouncedValues = useDebouncedValue(values, 500)
  const ready = appSlug !== null && connectionId !== '' && fileId !== '' && hasMapping

  const query = useQuery({
    queryKey: ['tabular-preview', appSlug, debouncedValues],
    queryFn: () => appsApi.previewAppData(appSlug ?? '', debouncedValues),
    enabled: ready,
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  })

  if (!spec) return null
  if (!ready) {
    return <p className="text-sm text-secondary">{t('apps.tabular.preview.notReady')}</p>
  }

  // Connectors disagree on the payload key: the menu connector emits `items`,
  // OpsBoard emits `rows`. Read what the spec declares rather than assuming.
  const payloadItemsKey = spec.payloadItemsKey ?? 'items'
  const payload = query.data?.data as Record<string, unknown> | null | undefined
  const payloadRows = payload?.[payloadItemsKey]
  const rows: SyncedRow[] = Array.isArray(payloadRows) ? (payloadRows as SyncedRow[]) : []
  const meta: AppDataMeta | null = query.data?.meta ?? null
  const shownRows = rows.slice(0, 30)

  const convertToManual = (): void => {
    if (!patchConfig || !spec.itemsKey) return
    patchConfig({
      [spec.itemsKey]: rows,
      [spec.sourceKey]: 'manual',
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-secondary">
          {query.isFetching
            ? t('apps.tabular.preview.refreshing')
            : meta?.stale
              ? t('apps.tabular.preview.stale')
              : t('apps.tabular.preview.rowCount', { count: rows.length })}
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={t('apps.tabular.preview.refresh')}
            disabled={query.isFetching}
            onClick={() => {
              void query.refetch()
            }}
          >
            <RefreshCwIcon className={query.isFetching ? 'animate-spin' : ''} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={(disabled ?? false) || rows.length === 0}
            onClick={convertToManual}
          >
            <PencilIcon className="size-3.5" />
            {t('apps.tabular.preview.convertToManual')}
          </Button>
        </div>
      </div>

      {query.isError ? (
        <p className="text-sm text-danger">{t('apps.tabular.preview.loadError')}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-secondary">
          {query.isLoading
            ? t('apps.tabular.preview.loading')
            : t('apps.tabular.preview.empty')}
        </p>
      ) : (
        <div className="border-secondary max-h-64 overflow-auto rounded-lg border">
          <table className="w-full text-left text-xs">
            <thead className="bg-panel sticky top-0">
              <tr>
                {spec.targets.map((target) => (
                  <th key={target.key} className="px-2 py-1.5 font-medium text-secondary">
                    {target.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shownRows.map((row, index) => (
                <tr key={index} className="border-secondary border-t">
                  {spec.targets.map((target) => (
                    <td key={target.key} className="max-w-40 truncate px-2 py-1.5">
                      {formatCell(row[target.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > shownRows.length ? (
            <p className="px-2 py-1.5 text-xs text-secondary">
              {t('apps.tabular.preview.more', { count: rows.length - shownRows.length })}
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}

function formatCell(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return ''
}

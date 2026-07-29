import type { Field } from '@signagewall/apps-contract'
import { FileUpIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ColumnMappingEditor } from '@/features/apps/config-form/tabular/ColumnMappingEditor'
import {
  autoMap,
  mapCsvRows,
  parseCsv,
  type CsvTable,
} from '@/features/apps/config-form/tabular/csv'

interface CsvImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The repeater's sub-fields — the mapping targets and value coercion rules. */
  subFields: Field[]
  /** Whether the list already has rows (enables "append" alongside "replace"). */
  hasExistingRows: boolean
  onImport: (rows: Record<string, unknown>[], mode: 'replace' | 'append') => void
}

/**
 * One-time CSV import into a repeater: pick a file (parsed in the browser —
 * nothing is uploaded or stored), map its columns onto the row fields, and
 * write the rows into the list. The mapping UI is the same editor the live
 * sheet sync uses, so the two flows read identically.
 */
export function CsvImportDialog({
  open,
  onOpenChange,
  subFields,
  hasExistingRows,
  onImport,
}: CsvImportDialogProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [table, setTable] = useState<CsvTable | null>(null)
  const [fileName, setFileName] = useState('')
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const targets = subFields.map((sub) => ({
    key: sub.key,
    label: sub.label,
    ...(sub.required !== undefined ? { required: sub.required } : {}),
  }))

  const reset = (): void => {
    setTable(null)
    setFileName('')
    setMapping({})
    setError(null)
  }

  const handleFile = async (file: File | undefined): Promise<void> => {
    if (!file) return
    try {
      const parsed = parseCsv(await file.text())
      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        setError(t('apps.tabular.csv.emptyFile'))
        return
      }
      setError(null)
      setFileName(file.name)
      setTable(parsed)
      setMapping(autoMap(parsed.headers, targets))
    } catch {
      setError(t('apps.tabular.csv.parseError'))
    }
  }

  const mappedRows = table ? mapCsvRows(table, mapping, subFields) : []
  const requiredMissing = targets.some(
    (target) => target.required === true && mapping[target.key] === undefined,
  )

  const finish = (mode: 'replace' | 'append'): void => {
    onImport(mappedRows, mode)
    onOpenChange(false)
    reset()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) reset()
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('apps.tabular.csv.title')}</DialogTitle>
          <DialogDescription>{t('apps.tabular.csv.description')}</DialogDescription>
        </DialogHeader>

        {table === null ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="border-secondary hover:border-brand/50 flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center"
          >
            <FileUpIcon className="text-secondary size-6" />
            <span className="text-sm font-medium text-primary">
              {t('apps.tabular.csv.pickFile')}
            </span>
            <span className="text-xs text-secondary">{t('apps.tabular.csv.hint')}</span>
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-secondary">
              {t('apps.tabular.csv.parsed', {
                file: fileName,
                rows: table.rows.length,
              })}
            </p>
            <ColumnMappingEditor
              headers={table.headers}
              targets={targets}
              value={mapping}
              onChange={setMapping}
            />
            <p className="text-xs text-secondary">
              {t('apps.tabular.csv.willImport', { count: mappedRows.length })}
            </p>
          </div>
        )}

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv,text/plain"
          className="hidden"
          onChange={(event) => {
            void handleFile(event.target.files?.[0])
            event.target.value = ''
          }}
        />

        {table !== null ? (
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={reset}>
              {t('apps.tabular.csv.pickAnother')}
            </Button>
            {hasExistingRows ? (
              <Button
                type="button"
                variant="outline"
                disabled={mappedRows.length === 0 || requiredMissing}
                onClick={() => {
                  finish('append')
                }}
              >
                {t('apps.tabular.csv.append')}
              </Button>
            ) : null}
            <Button
              type="button"
              disabled={mappedRows.length === 0 || requiredMissing}
              onClick={() => {
                finish('replace')
              }}
            >
              {t('apps.tabular.csv.replace')}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

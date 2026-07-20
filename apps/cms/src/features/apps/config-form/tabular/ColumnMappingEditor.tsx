import type { ColumnMappingTarget } from '@edge/apps-contract'
import { useTranslation } from 'react-i18next'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/** The select value meaning "this target isn't mapped". */
const NONE = '__none__'

interface ColumnMappingEditorProps {
  /** The columns on offer — the sheet/CSV header row. */
  headers: string[]
  /** The item fields a column can be mapped onto. */
  targets: ColumnMappingTarget[]
  /** target key → header name. */
  value: Record<string, string>
  onChange: (value: Record<string, string>) => void
  disabled?: boolean | undefined
}

/**
 * One picker per target field, offering the source's columns. Shared between
 * the `column-mapping` config control (sheet headers from the backend) and the
 * CSV import dialog (headers from the parsed file).
 */
export function ColumnMappingEditor({
  headers,
  targets,
  value,
  onChange,
  disabled,
}: ColumnMappingEditorProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-2">
      {targets.map((target) => {
        const current = value[target.key]
        // A stored header that no longer exists in the sheet still shows (as a
        // stale option) rather than silently reading as unmapped.
        const options = current !== undefined && !headers.includes(current)
          ? [...headers, current]
          : headers
        return (
          <div key={target.key} className="grid grid-cols-2 items-center gap-2">
            <span className="truncate text-sm text-primary">
              {target.label}
              {target.required ? <span className="text-danger"> *</span> : null}
            </span>
            <Select
              value={current ?? NONE}
              disabled={disabled ?? false}
              onValueChange={(next) => {
                if (next === NONE) {
                  onChange(
                    Object.fromEntries(
                      Object.entries(value).filter(([key]) => key !== target.key),
                    ),
                  )
                } else {
                  onChange({ ...value, [target.key]: next })
                }
              }}
            >
              <SelectTrigger className="w-full" aria-invalid={target.required === true && current === undefined}>
                <SelectValue placeholder={t('apps.tabular.mapping.none')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{t('apps.tabular.mapping.none')}</SelectItem>
                {options.map((header) => (
                  <SelectItem key={header} value={header}>
                    {header}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      })}
    </div>
  )
}

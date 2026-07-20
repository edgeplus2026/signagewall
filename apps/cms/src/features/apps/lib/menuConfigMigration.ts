import type { AppInstanceConfig } from '@/features/apps/types/app.types'

/**
 * Menu board v1 → v2 config normalization, applied when the config page loads a
 * pre-v2 instance (schema defaults for the new fields — `source`, `template`,
 * `currency` — are merged separately from `buildDefaultConfig`).
 *
 * v1 stored `price` as free-form text ("25 kr", "2,50"). v2 validates it as a
 * number, so an untouched v1 instance would fail validation on its first save.
 * Rows are normalized here, not in the backend: stored configs keep playing
 * untouched (the embed renders string prices verbatim) and only self-heal when
 * an operator actually edits the instance.
 *
 * - "25 kr" / "€2,50" → 25 / 2.5 (first numeric token; ',' accepted as decimal)
 * - genuinely non-numeric ("ask us") → price dropped, text kept by appending it
 *   to the description so nothing the operator wrote is lost
 * - the removed `columns` field is dropped (the design select replaced it)
 */
export function migrateMenuConfig(config: AppInstanceConfig): AppInstanceConfig {
  const rest = { ...config }
  delete rest.columns
  const items = Array.isArray(config.items)
    ? config.items.map((row) => migrateRow(row))
    : config.items
  return { ...rest, items }
}

/** Whether the stored config still carries v1 shapes worth migrating. */
export function menuConfigNeedsMigration(config: AppInstanceConfig): boolean {
  if ('columns' in config) return true
  if (typeof config.items === 'string') return false // legacy textarea: embed-only
  return (
    Array.isArray(config.items) &&
    config.items.some(
      (row) =>
        typeof (row as Record<string, unknown> | null)?.price === 'string',
    )
  )
}

function migrateRow(row: unknown): unknown {
  if (row === null || typeof row !== 'object') return row
  const record = { ...(row as Record<string, unknown>) }
  if (typeof record.price !== 'string') return record

  const text = record.price.trim()
  if (text === '') {
    delete record.price
    return record
  }
  const parsed = parsePriceText(text)
  if (parsed !== undefined) {
    record.price = parsed
  } else {
    delete record.price
    const description = typeof record.description === 'string' ? record.description : ''
    record.description = description ? `${description} — ${text}` : text
  }
  return record
}

/** The first numeric token of a free-form price; ',' accepted as decimal mark. */
function parsePriceText(text: string): number | undefined {
  const match = /-?\d+(?:[.,]\d+)?/.exec(text.replace(/\s/g, ''))
  if (!match) return undefined
  const value = Number(match[0].replace(',', '.'))
  return Number.isFinite(value) ? value : undefined
}

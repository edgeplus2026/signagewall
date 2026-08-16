import { DEFAULT_MENU_TEMPLATE, RETIRED_MENU_TEMPLATES } from '@signagewall/apps'

import type { AppInstanceConfig } from '@/features/apps/types/app.types'

const RETIRED = new Set<string>(RETIRED_MENU_TEMPLATES)

/**
 * Menu board config normalization, applied when the config page loads an
 * instance saved against an older schema (schema defaults for newer fields —
 * `source`, `template`, `currency` — are merged separately from
 * `buildDefaultConfig`).
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
 * - a retired design (`gallery`, `noir`) falls back to the default one. The
 *   embed already falls back at render time, but the config select compiles to
 *   a `z.enum` of the designs that still ship, so leaving the old value would
 *   fail validation and block saving a board the operator never touched.
 */
export function migrateMenuConfig(config: AppInstanceConfig): AppInstanceConfig {
  const rest = { ...config }
  delete rest.columns
  if (typeof rest.template === 'string' && RETIRED.has(rest.template)) {
    rest.template = DEFAULT_MENU_TEMPLATE
  }
  const items = Array.isArray(config.items)
    ? config.items.map((row) => migrateRow(row))
    : config.items
  return { ...rest, items }
}

/** Whether the stored config still carries shapes worth migrating. */
export function menuConfigNeedsMigration(config: AppInstanceConfig): boolean {
  if ('columns' in config) return true
  if (typeof config.template === 'string' && RETIRED.has(config.template)) {
    return true
  }
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

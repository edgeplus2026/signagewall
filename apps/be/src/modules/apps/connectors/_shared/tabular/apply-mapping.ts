/**
 * Shared column-mapping application for tabular-sync connectors (menu board
 * today; any future app that spreads `tabularSourceFields()` into its schema).
 * A provider reader hands over `{ headers, rows }` as displayed text; the
 * instance config carries `mapping: { targetKey: headerName }`; this turns each
 * row into a record keyed by target.
 */

export interface TabularTable {
  headers: string[];
  rows: string[][];
}

/** Data rows read from a synced sheet, capped at the source. */
export const MAX_TABULAR_ROWS = 200;

/**
 * Header-name mapping (not column letters): robust to column reordering, which
 * is the edit spreadsheets actually get. A mapped header that no longer exists
 * simply yields no value for that target. Rows with every mapped cell blank are
 * dropped (spreadsheets accumulate empty tails).
 */
export function applyColumnMapping(
  table: TabularTable,
  mapping: Record<string, string>,
): Record<string, string>[] {
  const headerIndex = new Map<string, number>();
  table.headers.forEach((header, index) => {
    const name = header.trim();
    // First occurrence wins for duplicate header names.
    if (name && !headerIndex.has(name)) headerIndex.set(name, index);
  });

  const entries = Object.entries(mapping).filter(
    ([, header]) => typeof header === 'string' && header.trim() !== '',
  );

  return table.rows
    .map((cells) => {
      const record: Record<string, string> = {};
      for (const [target, header] of entries) {
        const index = headerIndex.get(header.trim());
        if (index === undefined) continue;
        const value = (cells[index] ?? '').trim();
        if (value !== '') record[target] = value;
      }
      return record;
    })
    .filter((record) => Object.keys(record).length > 0);
}

/**
 * The first numeric token of a displayed price ("2,50 €" → 2.5; "25 kr" → 25).
 * Undefined when the cell holds no number at all — callers keep the raw text
 * in that case so "ask us" still renders.
 */
export function parsePriceNumber(text: string): number | undefined {
  const match = /-?\d+(?:[.,]\d+)?/.exec(text.replace(/\s/g, ''));
  if (!match) return undefined;
  const value = Number(match[0].replace(',', '.'));
  return Number.isFinite(value) ? value : undefined;
}

/** Tiny stable hash for keying a mapping into a connector cache key. */
export function hashMapping(
  mapping: Record<string, string> | undefined,
): string {
  const canonical = JSON.stringify(
    Object.entries(mapping ?? {}).sort(([a], [b]) => a.localeCompare(b)),
  );
  // FNV-1a, 32-bit.
  let hash = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i += 1) {
    hash ^= canonical.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

import type { Field } from '@edge/apps-contract'

/**
 * Small client-side CSV reader for the repeater "Import CSV" flow. Handles
 * quoted fields (embedded delimiters, quotes, newlines) and sniffs the
 * delimiter (`,`, `;`, tab) from the header line — European exports routinely
 * use `;`. ~60 lines beats a dependency for a one-time import.
 */
export interface CsvTable {
  headers: string[]
  rows: string[][]
}

export function parseCsv(text: string): CsvTable {
  // Strip a leading BOM (Excel loves to write one).
  const content = text.replace(/^\uFEFF/, '')
  const delimiter = sniffDelimiter(content)
  const records: string[][] = []
  let record: string[] = []
  let cell = ''
  let inQuotes = false

  const endCell = (): void => {
    record.push(cell)
    cell = ''
  }
  const endRecord = (): void => {
    endCell()
    // Skip blank lines (a lone empty cell).
    if (record.length > 1 || (record[0] ?? '').trim() !== '') {
      records.push(record)
    }
    record = []
  }

  for (let i = 0; i < content.length; i += 1) {
    const ch = content.charAt(i)
    if (inQuotes) {
      if (ch === '"') {
        if (content[i + 1] === '"') {
          cell += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        cell += ch
      }
    } else if (ch === '"' && cell === '') {
      inQuotes = true
    } else if (ch === delimiter) {
      endCell()
    } else if (ch === '\n') {
      endRecord()
    } else if (ch !== '\r') {
      cell += ch
    }
  }
  if (cell !== '' || record.length > 0) endRecord()

  const headers = (records[0] ?? []).map((header, i) => header.trim() || columnLetter(i))
  return { headers, rows: records.slice(1) }
}

function sniffDelimiter(content: string): string {
  const firstLine = content.slice(0, !content.includes('\n') ? undefined : content.indexOf('\n'))
  let best = ','
  let bestCount = 0
  for (const candidate of [',', ';', '\t']) {
    const count = firstLine.split(candidate).length - 1
    if (count > bestCount) {
      best = candidate
      bestCount = count
    }
  }
  return best
}

/** 0 → "A", 26 → "AA" — the fallback name for a blank header cell. */
export function columnLetter(index: number): string {
  let name = ''
  let n = index
  do {
    name = String.fromCharCode(65 + (n % 26)) + name
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return name
}

/** The first numeric token of a free-form price; ',' accepted as decimal mark. */
export function parseNumberText(text: string): number | undefined {
  const match = /-?\d+(?:[.,]\d+)?/.exec(text.replace(/\s/g, ''))
  if (!match) return undefined
  const value = Number(match[0].replace(',', '.'))
  return Number.isFinite(value) ? value : undefined
}

/**
 * Auto-map: match headers to targets by name (case-insensitive, punctuation
 * ignored) so a sheet whose header row says "Name; Price; Description" needs no
 * clicking at all. Only fills targets a header actually matches.
 */
export function autoMap(
  headers: string[],
  targets: { key: string; label: string }[],
): Record<string, string> {
  const normalize = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, '')
  const mapping: Record<string, string> = {}
  for (const target of targets) {
    const wanted = [normalize(target.key), normalize(target.label)]
    const header = headers.find((candidate) => wanted.includes(normalize(candidate)))
    if (header !== undefined) mapping[target.key] = header
  }
  return mapping
}

/**
 * Apply a header→target mapping to raw rows, producing repeater row objects.
 * Values land as trimmed strings except `number`-typed sub-fields, which are
 * parsed ("2,50 €" → 2.5; unparsable → left unset). Rows with every mapped
 * cell empty are dropped.
 */
export function mapCsvRows(
  table: CsvTable,
  mapping: Record<string, string>,
  subFields: Field[],
): Record<string, unknown>[] {
  const headerIndex = new Map(table.headers.map((header, i) => [header, i]))
  const typeByKey = new Map(subFields.map((sub) => [sub.key, sub.type]))
  return table.rows
    .map((cells) => {
      const row: Record<string, unknown> = {}
      for (const [targetKey, header] of Object.entries(mapping)) {
        const index = headerIndex.get(header)
        if (index === undefined) continue
        const raw = (cells[index] ?? '').trim()
        if (raw === '') continue
        if (typeByKey.get(targetKey) === 'number') {
          const parsed = parseNumberText(raw)
          if (parsed !== undefined) row[targetKey] = parsed
        } else {
          row[targetKey] = raw
        }
      }
      return row
    })
    .filter((row) => Object.keys(row).length > 0)
}

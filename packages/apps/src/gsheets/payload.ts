/**
 * Normalized Google Sheets payload — the contract between the backend `gsheets`
 * connector and the embed bundle. `values` is the read range row-major; rows can
 * be ragged (Google omits trailing empty cells), so the bundle pads them. No
 * fetch timestamp: the payload changes with the cell values, not on a clock tick.
 */
export interface GsheetsPayload {
  /** Spreadsheet name, for the header (from the picked resource). */
  title: string
  /** Cell values of the read range, row-major; rows may be ragged. */
  values: string[][]
}

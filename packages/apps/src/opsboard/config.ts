export type OpsBoardPreset = 'shift' | 'dispatch' | 'kpi' | 'safety' | 'custom'

export type OpsBoardLayout = 'status-table' | 'cards' | 'queue'

export type OpsBoardSource = 'manual' | 'gsheets' | 'excel'

export type OpsBoardTheme = 'light' | 'dark'

export interface OpsBoardManualRow {
  label: string
  primary?: string
  secondary?: string
  status?: string
  note?: string
  group?: string
  sortOrder?: number
}

/** Config persisted on an OpsBoard app instance. */
export interface OpsBoardConfig {
  preset: OpsBoardPreset
  heading?: string
  source: OpsBoardSource
  connectionId?: string
  spreadsheet?: { id: string; label?: string }
  workbook?: { id: string; label?: string }
  worksheet?: string
  mapping?: Record<string, string>
  rows?: OpsBoardManualRow[]
  layout: OpsBoardLayout
  showHeader: boolean
  theme: OpsBoardTheme
}

import type { ColumnMappingSpec, ColumnMappingTarget, Field } from '@signagewall/apps-contract'

/**
 * The reusable "where do the rows come from" config block for apps whose
 * content is a table: a manual repeater, a one-time CSV import, or a live sync
 * from Google Sheets / Microsoft Excel with column mapping.
 *
 * An app adopts the whole flow by spreading `tabularSourceFields({...})` into
 * its config schema right after its manual repeater field. The emitted field
 * keys are fixed (`source`, `connectionId`, `spreadsheet`, `workbook`,
 * `worksheet`, `mapping`, `syncedItems`) so the backend tabular helpers and the
 * CMS controls can rely on them; per-app variation lives in `targets` (which
 * item fields a column can map onto) and `itemsKey` (the app's repeater).
 *
 * The matching backend piece is `apps/be/.../connectors/_shared/tabular/` —
 * a connector dispatches on `config.source` and applies `config.mapping`.
 */
export const TABULAR_SOURCES = ['manual', 'gsheets', 'excel'] as const
export type TabularSource = (typeof TABULAR_SOURCES)[number]

export interface TabularSourceOptions {
  /** The item fields a spreadsheet column can be mapped onto. */
  targets: ColumnMappingTarget[]
  /** The app's manual repeater field key (for "convert to manual"). */
  itemsKey: string
  /** Optional form section for the sync fields. */
  section?: string
  /**
   * Render that section expanded. Worth setting when the section holds the
   * app's content rather than optional trimming — see {@link Field.sectionOpen}.
   */
  sectionOpen?: boolean
}

export function tabularSourceFields(options: TabularSourceOptions): Field[] {
  const { targets, itemsKey } = options
  // Spread-friendly under `exactOptionalPropertyTypes`: omit the key entirely
  // when no section was given.
  const section = options.section !== undefined ? { section: options.section } : {}
  // Only the first field carries it; the CMS reads it per section, not per field.
  const sectionOpen = options.sectionOpen === true ? { sectionOpen: true } : {}
  const mappingSpec: ColumnMappingSpec = {
    targets,
    connectionKey: 'connectionId',
    sourceKey: 'source',
    fileKeyBySource: { gsheets: 'spreadsheet', excel: 'workbook' },
    worksheetKey: 'worksheet',
    itemsKey,
  }
  const syncVisible = { field: 'source', equalsAny: ['gsheets', 'excel'] }
  return [
    {
      key: 'source',
      type: 'select',
      label: 'Items come from',
      ...section,
      ...sectionOpen,
      default: 'manual',
      // Three mutually exclusive modes that rewrite the rest of the section —
      // that is a switch, not a value, so show all three at once.
      buttonGroup: true,
      help: 'Keep the rows here, or sync them live from a spreadsheet you already maintain.',
      options: [
        { label: 'Manual table', value: 'manual' },
        { label: 'Google Sheets', value: 'gsheets' },
        { label: 'Microsoft Excel', value: 'excel' },
      ],
    },
    {
      key: 'connectionId',
      type: 'oauth',
      label: 'Account',
      ...section,
      visibleWhen: syncVisible,
      providerFrom: { field: 'source', map: { gsheets: 'google', excel: 'microsoft' } },
      help: 'Sign in once. SignageWall then lists your files to choose from.',
    },
    {
      key: 'spreadsheet',
      type: 'remote-select',
      label: 'Spreadsheet',
      ...section,
      visibleWhen: { field: 'source', equals: 'gsheets' },
      remoteSource: 'google-sheets',
      placeholder: 'Search your spreadsheets…',
      help: 'Pick a spreadsheet from your Google Drive.',
    },
    {
      key: 'workbook',
      type: 'remote-select',
      label: 'Workbook',
      ...section,
      visibleWhen: { field: 'source', equals: 'excel' },
      remoteSource: 'excel-files',
      placeholder: 'Search your Excel files…',
      help: 'Pick an .xlsx file from your OneDrive or SharePoint.',
    },
    {
      key: 'worksheet',
      type: 'text',
      label: 'Worksheet',
      ...section,
      visibleWhen: syncVisible,
      placeholder: 'Sheet1',
      help: 'The tab to read. Leave blank for the first one.',
    },
    {
      key: 'mapping',
      type: 'column-mapping',
      label: 'Column mapping',
      ...section,
      visibleWhen: syncVisible,
      columnMapping: mappingSpec,
      help: 'Tell SignageWall which spreadsheet column holds what. The first row is read as headers.',
    },
    {
      key: 'syncedItems',
      type: 'tabular-preview',
      label: 'Synced rows',
      ...section,
      visibleWhen: syncVisible,
      columnMapping: mappingSpec,
    },
  ]
}

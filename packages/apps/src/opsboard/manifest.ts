import type { AppManifest } from '@signagewall/apps-contract'

import { tabularSourceFields } from '../_shared/tabular-source.js'
import { OPSBOARD_PRESETS } from './presets.js'

const OPSBOARD_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11"/><path d="m13 14 2 2 4-4"/></svg>'

const presetOptions = (
  [
    ['shift', 'Live Shift Board'],
    ['dispatch', 'Dock & Dispatch'],
    ['kpi', 'KPI Board'],
    ['safety', 'Digital Safety Board'],
    ['custom', 'Custom operations board'],
  ] as const
).map(([value, label]) => {
  const preset = OPSBOARD_PRESETS[value]
  return {
    value,
    label,
    set: {
      heading: preset.heading,
      layout: preset.layout,
      theme: preset.theme,
      showHeader: true,
    },
  }
})

/**
 * One tabular operations engine for shift, dispatch, KPI and safety boards.
 * Manual rows stay in config; connected rows are normalized by the backend and
 * snapshot-cached for offline/last-known-good playback.
 */
export const opsboardManifest: AppManifest = {
  slug: 'opsboard',
  name: 'OpsBoard',
  tagline: 'Live shift, dispatch, KPI and safety boards',
  description:
    'Turn a manual table, Google Sheet or Excel workbook into a clear operational screen that stays useful when a source is temporarily unavailable.',
  runtimeKind: 'embed',
  dataSource: 'connected',
  version: 2,
  /**
   * One minute — same reasoning as the menu board it shares its Sheets sync
   * with: Drive push is throttled to roughly one notification per three minutes,
   * so the poll cadence is the real bound on how fast an ops board moves.
   */
  refreshSeconds: 60,
  icon: OPSBOARD_ICON,
  color: '#22C55E',
  configSchema: [
    {
      key: 'preset',
      type: 'select',
      label: 'Board type',
      default: 'shift',
      options: presetOptions,
      help: 'Starts with practical labels and a suitable layout. All board types use the same row format.',
    },
    {
      key: 'heading',
      type: 'text',
      label: 'Heading',
      default: OPSBOARD_PRESETS.shift.heading,
      placeholder: 'Live Shift Board',
    },
    ...tabularSourceFields({
      itemsKey: 'rows',
      // The OpsBoard connector returns `playerPayload: { rows }`, not `items`.
      payloadItemsKey: 'rows',
      targets: [
        { key: 'label', label: 'Line / vehicle / KPI / item', required: true },
        { key: 'primary', label: 'Plan / appointment / primary value' },
        { key: 'secondary', label: 'Actual / carrier / secondary value' },
        { key: 'status', label: 'Operational status' },
        { key: 'note', label: 'Blocker / instruction / note' },
        { key: 'group', label: 'Area / shift / zone' },
        { key: 'sortOrder', label: 'Sort order' },
      ],
    }),
    {
      key: 'rows',
      type: 'repeater',
      label: 'Rows',
      visibleWhen: { field: 'source', equals: 'manual' },
      csvImport: true,
      required: true,
      validation: { min: 1, max: 200 },
      help: 'Add rows here, or switch the source above to sync the same fields from a spreadsheet.',
      fields: [
        { key: 'label', type: 'text', label: 'Item', required: true },
        { key: 'primary', type: 'text', label: 'Primary' },
        { key: 'secondary', type: 'text', label: 'Secondary' },
        {
          key: 'status',
          type: 'select',
          label: 'Status',
          default: 'neutral',
          options: [
            { value: 'neutral', label: 'Neutral' },
            { value: 'planned', label: 'Planned' },
            { value: 'active', label: 'Active' },
            { value: 'warning', label: 'Warning' },
            { value: 'blocked', label: 'Blocked' },
            { value: 'done', label: 'Done' },
          ],
        },
        { key: 'note', type: 'text', label: 'Note' },
        { key: 'group', type: 'text', label: 'Group' },
        { key: 'sortOrder', type: 'number', label: 'Order' },
      ],
    },
    {
      key: 'layout',
      type: 'select',
      label: 'Layout',
      default: OPSBOARD_PRESETS.shift.layout,
      options: [
        { value: 'status-table', label: 'Status table' },
        { value: 'cards', label: 'Cards' },
        { value: 'queue', label: 'Queue' },
      ],
    },
    {
      key: 'showHeader',
      type: 'switch',
      label: 'Show column labels',
      default: true,
    },
    {
      key: 'theme',
      type: 'select',
      label: 'Theme',
      default: OPSBOARD_PRESETS.shift.theme,
      options: [
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' },
      ],
    },
  ],
}

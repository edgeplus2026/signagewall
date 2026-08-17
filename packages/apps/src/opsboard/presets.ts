import type { OpsBoardLayout, OpsBoardPreset, OpsBoardTheme } from './config.js'

export interface OpsBoardLabels {
  label: string
  primary: string
  secondary: string
  status: string
  note: string
  group: string
}

export interface OpsBoardPresetDefinition {
  heading: string
  layout: OpsBoardLayout
  theme: OpsBoardTheme
  labels: OpsBoardLabels
}

/** Display defaults only; every preset keeps the same normalized row payload. */
export const OPSBOARD_PRESETS: Record<
  OpsBoardPreset,
  OpsBoardPresetDefinition
> = {
  shift: {
    heading: 'Live Shift Board',
    layout: 'status-table',
    theme: 'dark',
    labels: {
      label: 'Line',
      primary: 'Plan',
      secondary: 'Actual',
      status: 'Status',
      note: 'Blocker / instruction',
      group: 'Area / shift',
    },
  },
  dispatch: {
    heading: 'Dock & Dispatch',
    layout: 'queue',
    theme: 'dark',
    labels: {
      label: 'Vehicle / dock',
      primary: 'Appointment',
      secondary: 'Carrier',
      status: 'Status',
      note: 'Instruction',
      group: 'Zone',
    },
  },
  kpi: {
    heading: 'KPI Board',
    layout: 'cards',
    theme: 'dark',
    labels: {
      label: 'KPI',
      primary: 'Target',
      secondary: 'Actual',
      status: 'Status',
      note: 'Note',
      group: 'Area',
    },
  },
  safety: {
    heading: 'Digital Safety Board',
    layout: 'cards',
    theme: 'dark',
    labels: {
      label: 'Safety item',
      primary: 'Target',
      secondary: 'Current',
      status: 'Status',
      note: 'Safety message',
      group: 'Area',
    },
  },
  custom: {
    heading: 'Operations Board',
    layout: 'status-table',
    theme: 'dark',
    labels: {
      label: 'Item',
      primary: 'Primary',
      secondary: 'Secondary',
      status: 'Status',
      note: 'Note',
      group: 'Group',
    },
  },
}

export function opsBoardPreset(value: unknown): OpsBoardPresetDefinition {
  const key =
    typeof value === 'string' && value in OPSBOARD_PRESETS
      ? (value as OpsBoardPreset)
      : 'shift'
  return OPSBOARD_PRESETS[key]
}

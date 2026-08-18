import type { OpsBoardConfig } from '../../src/opsboard/config.js'
import type {
  OpsBoardPayload,
  OpsBoardStatus,
} from '../../src/opsboard/payload.js'

export interface OpsBoardResponsiveFixture {
  name: string
  viewport: { width: number; height: number }
  config: OpsBoardConfig
  payload: OpsBoardPayload
}

const statuses: OpsBoardStatus[] = [
  'planned',
  'active',
  'warning',
  'blocked',
  'done',
  'neutral',
]

function rows(prefix: string): OpsBoardPayload['rows'] {
  return Array.from({ length: 100 }, (_, index) => ({
    label: `${prefix} ${String(index + 1).padStart(3, '0')}`,
    primary: `${String(6 + (index % 12)).padStart(2, '0')}:00`,
    secondary: `${92 + (index % 9)}%`,
    status: statuses[index % statuses.length] ?? 'neutral',
    note:
      index % 5 === 0
        ? 'Long operational note used to verify that content clamps inside its page slot.'
        : 'On plan',
    group: `Area ${1 + (index % 4)}`,
  }))
}

/** Fixtures for visual/screenshot harnesses; both force twenty or more pages. */
export const OPSBOARD_RESPONSIVE_FIXTURES: OpsBoardResponsiveFixture[] = [
  {
    name: 'dispatch-1080p-landscape-100-rows',
    viewport: { width: 1920, height: 1080 },
    config: {
      preset: 'dispatch',
      heading: 'Dock & Dispatch',
      source: 'excel',
      connectionId: 'fixture-microsoft',
      workbook: { id: 'fixture-drive|fixture-item', label: 'Dispatch.xlsx' },
      layout: 'queue',
      showHeader: true,
      theme: 'dark',
    },
    payload: { sourceTitle: 'Dispatch.xlsx', rows: rows('Dock') },
  },
  {
    name: 'safety-1080p-portrait-100-rows',
    viewport: { width: 1080, height: 1920 },
    config: {
      preset: 'safety',
      heading: 'Digital Safety Board',
      source: 'gsheets',
      connectionId: 'fixture-google',
      spreadsheet: { id: 'fixture-sheet', label: 'Safety checks' },
      layout: 'cards',
      showHeader: true,
      theme: 'light',
    },
    payload: { sourceTitle: 'Safety checks', rows: rows('Check') },
  },
]

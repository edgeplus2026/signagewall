import type { HydratedPrivateAssetRef } from '@signagewall/apps-contract'

import type { SecurePowerBiConfig } from '../../src/powerbi-secure/config.js'
import type { SecurePowerBiPayload } from '../../src/powerbi-secure/payload.js'
import type { SecurePowerBiMeta, ViewportShape } from './runtime.js'

function page(number: number, version = 'export-v7'): HydratedPrivateAssetRef {
  return {
    kind: 'private-asset',
    key: `org-fixture/instance-fixture/connection-fixture/${version}/page-${number}.webp`,
    version,
    mimeType: 'image/webp',
    url: `https://private-assets.example.test/org-fixture/${version}/page-${number}.webp`,
  }
}

const config: SecurePowerBiConfig = {
  connectionId: 'fixture-microsoft',
  workspace: { id: 'fixture-workspace', label: 'Operations' },
  report: { id: 'fixture-report', label: 'Shift command centre' },
  refreshMinutes: 15,
  fit: 'contain',
  background: '#000000',
}

const payload: SecurePowerBiPayload = {
  reportName: 'Shift command centre',
  pages: [page(1), page(2), page(3)],
  exportedAt: '2026-08-05T08:15:00.000Z',
  sourceVersion: 'export-v7',
}

export interface PowerBiSecureResponsiveFixture {
  name: string
  viewport: { width: number; height: number }
  expectedShape: ViewportShape
  config: SecurePowerBiConfig
  payload: SecurePowerBiPayload
}

/** Visual harness inputs cover common wall and portrait kiosk proportions. */
export const POWERBI_SECURE_RESPONSIVE_FIXTURES: PowerBiSecureResponsiveFixture[] =
  [
    {
      name: 'three-pages-1080p-landscape',
      viewport: { width: 1920, height: 1080 },
      expectedShape: 'landscape',
      config,
      payload,
    },
    {
      name: 'three-pages-1080p-portrait',
      viewport: { width: 1080, height: 1920 },
      expectedShape: 'portrait',
      config: { ...config, fit: 'cover' },
      payload,
    },
    {
      name: 'single-page-square',
      viewport: { width: 1080, height: 1080 },
      expectedShape: 'square',
      config,
      payload: { ...payload, pages: [page(1)] },
    },
  ]

export interface PowerBiSecureLifecycleFixture {
  name: string
  incoming: SecurePowerBiPayload | null
  retained: SecurePowerBiPayload | null
  meta: SecurePowerBiMeta | null
  expectedView: 'content' | 'pending' | 'empty' | 'error'
  expectedFreshness?: 'fresh' | 'pending' | 'stale'
  expectedPageCount: number
}

/**
 * Deterministic fixture table for a unit/screenshot harness. In particular it
 * proves the desired LKG decision: pending/stale null data retains three pages.
 */
export const POWERBI_SECURE_LIFECYCLE_FIXTURES: PowerBiSecureLifecycleFixture[] =
  [
    {
      name: 'fresh export',
      incoming: payload,
      retained: null,
      meta: null,
      expectedView: 'content',
      expectedFreshness: 'fresh',
      expectedPageCount: 3,
    },
    {
      name: 'pending refresh keeps last export',
      incoming: null,
      retained: payload,
      meta: { pending: true },
      expectedView: 'content',
      expectedFreshness: 'pending',
      expectedPageCount: 3,
    },
    {
      name: 'failed refresh keeps last export',
      incoming: null,
      retained: payload,
      meta: { stale: true },
      expectedView: 'content',
      expectedFreshness: 'stale',
      expectedPageCount: 3,
    },
    {
      name: 'first export pending',
      incoming: null,
      retained: null,
      meta: { pending: true },
      expectedView: 'pending',
      expectedPageCount: 0,
    },
    {
      name: 'first export failed safely',
      incoming: null,
      retained: null,
      meta: { stale: true },
      expectedView: 'error',
      expectedPageCount: 0,
    },
    {
      name: 'configured but not exported',
      incoming: null,
      retained: null,
      meta: null,
      expectedView: 'empty',
      expectedPageCount: 0,
    },
  ]

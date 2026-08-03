import { describe, expect, it } from 'vitest'

import {
  normalizePowerPointEmbedUrl,
  resolvePowerPointSource,
} from '@signagewall/apps'

import type { Renderable } from '../types'
import { itemRequiresNetwork } from './network-apps'

function powerpoint(config: Record<string, unknown>): Renderable {
  return {
    id: 'ppt',
    kind: 'app',
    slug: 'powerpoint',
    config,
    durationMs: 10_000,
  }
}

describe('PowerPoint source modes', () => {
  it('defaults an untouched instance to no-account embed mode', () => {
    expect(resolvePowerPointSource({})).toBe('embed')
    expect(itemRequiresNetwork(powerpoint({}))).toBe(true)
  })

  it('keeps legacy v2 connected instances in cached Microsoft mode', () => {
    const config = {
      connectionId: 'connection-1',
      presentation: { id: 'drive|item', label: 'Quarterly deck' },
    }
    expect(resolvePowerPointSource(config)).toBe('microsoft')
    expect(itemRequiresNetwork(powerpoint(config))).toBe(false)
  })

  it('marks only explicit embed mode as network-only', () => {
    expect(itemRequiresNetwork(powerpoint({ source: 'embed' }))).toBe(true)
    expect(itemRequiresNetwork(powerpoint({ source: 'microsoft' }))).toBe(false)
  })

  it('accepts Microsoft embed hosts and decodes iframe entities', () => {
    expect(
      normalizePowerPointEmbedUrl(
        'https://onedrive.live.com/embed?resid=abc&amp;authkey=secret',
      ),
    ).toBe('https://onedrive.live.com/embed?resid=abc&authkey=secret')
    expect(
      normalizePowerPointEmbedUrl(
        'https://tenant.sharepoint.com/sites/comms/_layouts/15/Doc.aspx?action=embedview',
      ),
    ).not.toBeNull()
  })

  it('rejects ordinary OneDrive share pages and non-Microsoft URLs', () => {
    expect(
      normalizePowerPointEmbedUrl('https://onedrive.live.com/?id=abc'),
    ).toBeNull()
    expect(
      normalizePowerPointEmbedUrl('https://onedrive.live.com/embedded-page'),
    ).toBeNull()
    expect(
      normalizePowerPointEmbedUrl('https://example.com/presentation.pptx'),
    ).toBeNull()
    expect(normalizePowerPointEmbedUrl('javascript:alert(1)')).toBeNull()
  })
})

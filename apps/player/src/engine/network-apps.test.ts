import { describe, expect, it } from 'vitest'

import {
  POWERPOINT_EMBED_URL_PATTERN,
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

  it('extracts the URL from the complete iframe copied by PowerPoint', () => {
    expect(
      normalizePowerPointEmbedUrl(
        '<iframe width="962" src="https://onedrive.live.com/embed?resid=abc&amp;authkey=secret" frameborder="0"></iframe>',
      ),
    ).toBe('https://onedrive.live.com/embed?resid=abc&authkey=secret')

    const currentOneDriveEmbed = normalizePowerPointEmbedUrl(
      '<iframe src="https://1drv.ms/p/c/F071154A61BA7999/IQS91ab1fa63661498e8a391fc452a5b4d7?e=public&amp;em=2"></iframe>',
    )
    expect(currentOneDriveEmbed).toBe(
      'https://1drv.ms/p/c/F071154A61BA7999/IQS91ab1fa63661498e8a391fc452a5b4d7?e=public&em=2',
    )
    expect(new RegExp(POWERPOINT_EMBED_URL_PATTERN).test(currentOneDriveEmbed!)).toBe(true)
  })

  it('converts public SharePoint and OneDrive links to embed view', () => {
    const sharePoint = normalizePowerPointEmbedUrl(
      'https://tenant.sharepoint.com/:p:/s/comms/deck?e=public-token',
    )
    expect(sharePoint).not.toBeNull()
    expect(new URL(sharePoint!).searchParams.get('action')).toBe('embedview')
    expect(new URL(sharePoint!).searchParams.get('wdbipreview')).toBe('true')

    expect(
      normalizePowerPointEmbedUrl(
        'https://onedrive.live.com/?resid=ABC!123&authkey=public-key',
      ),
    ).toBe(
      'https://onedrive.live.com/embed?resid=ABC%21123&authkey=public-key',
    )
  })

  it('rejects ordinary OneDrive share pages and non-Microsoft URLs', () => {
    expect(
      normalizePowerPointEmbedUrl('https://onedrive.live.com/'),
    ).toBeNull()
    expect(
      normalizePowerPointEmbedUrl('https://onedrive.live.com/embedded-page'),
    ).toBeNull()
    expect(
      normalizePowerPointEmbedUrl('https://example.com/presentation.pptx'),
    ).toBeNull()
    expect(normalizePowerPointEmbedUrl('javascript:alert(1)')).toBeNull()
    expect(
      normalizePowerPointEmbedUrl('https://1drv.ms/p/s!shortened'),
    ).toBeNull()
    expect(normalizePowerPointEmbedUrl('https://1drv.ms/p/c/missing-item')).toBeNull()
  })
})

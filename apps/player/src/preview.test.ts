import { afterEach, describe, expect, it, vi } from 'vitest'

import type { PreviewParams } from './preview'

/**
 * `previewParams` is resolved once at module load (the URL never changes within
 * a preview tab), so each case stubs the location and re-imports the module.
 */
async function parse(search: string): Promise<PreviewParams | null> {
  vi.stubGlobal('window', { location: { search } })
  vi.resetModules()
  const module = await import('./preview')
  return module.previewParams
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('previewParams', () => {
  it('is null for a normal (device) load', async () => {
    expect(await parse('')).toBeNull()
  })

  it('is null for `preview` without a target, so a stray flag cannot strand a device', async () => {
    expect(await parse('?preview=1')).toBeNull()
  })

  it('reads a screen target, defaulting to the device-mirroring mode', async () => {
    expect(await parse('?preview=1&screenId=abc')).toMatchObject({
      target: { kind: 'screen', screenId: 'abc' },
      mode: 'follow',
    })
  })

  it('reads an explicit standalone screen preview', async () => {
    expect(
      await parse('?preview=1&screenId=abc&mode=standalone'),
    ).toMatchObject({
      target: { kind: 'screen', screenId: 'abc' },
      mode: 'standalone',
    })
  })

  it('forces standalone for a playlist — there is no device to follow', async () => {
    expect(await parse('?preview=1&playlistId=pl1&mode=follow')).toMatchObject({
      target: { kind: 'playlist', playlistId: 'pl1' },
      mode: 'standalone',
    })
  })

  it('carries orientation and scale, falling back on garbage values', async () => {
    expect(
      await parse('?preview=1&screenId=abc&orientation=portrait&scale=zoom'),
    ).toMatchObject({ orientation: 'portrait', scale: 'zoom' })

    expect(
      await parse('?preview=1&screenId=abc&orientation=sideways&scale=huge'),
    ).toMatchObject({ orientation: 'landscape', scale: 'fit' })
  })
})

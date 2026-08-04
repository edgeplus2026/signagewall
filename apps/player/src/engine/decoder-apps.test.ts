import { describe, expect, it } from 'vitest'

import { holdsVideoDecoder } from './decoder-apps'
import type { AppRenderable, ImageRenderable, VideoRenderable } from '../types'

/**
 * Which items occupy one of the device's video decoders.
 *
 * The engine used to answer this with `kind === 'video'`, which is wrong in the
 * direction that costs a screen: an on-screen YouTube embed holds a decoder every
 * bit as much as an `.mp4`, so the engine warmed a real video into the other slot
 * behind it. The measured Android TV advertises exactly two hardware AVC
 * instances; past them Android falls back to a software decoder that SEGV-crashed
 * five times in one night of ordinary playback.
 */

const video: VideoRenderable = {
  id: 'v',
  kind: 'video',
  url: 'https://example.test/clip.mp4',
  durationMs: 1_000,
}

const image: ImageRenderable = {
  id: 'i',
  kind: 'image',
  url: 'https://example.test/still.jpg',
  durationMs: 1_000,
}

function app(slug: string): AppRenderable {
  return { id: `a-${slug}`, kind: 'app', slug, config: {}, durationMs: 1_000 }
}

describe('holdsVideoDecoder', () => {
  it('counts a plain video', () => {
    expect(holdsVideoDecoder(video)).toBe(true)
  })

  it('does not count an image', () => {
    expect(holdsVideoDecoder(image)).toBe(false)
  })

  /** The case the old `kind` check missed, and `youtube -> mp4` is an entirely
   *  ordinary rotation. */
  it('counts a media app on screen', () => {
    expect(holdsVideoDecoder(app('youtube'))).toBe(true)
    expect(holdsVideoDecoder(app('stream'))).toBe(true)
  })

  /** Over-flagging is not free either: it costs every transition out of that app a
   *  just-in-time prepare, so apps that do not decode must stay unflagged. */
  it('does not count an app that renders no video', () => {
    expect(holdsVideoDecoder(app('clock'))).toBe(false)
    expect(holdsVideoDecoder(app('weather'))).toBe(false)
  })

  it('is safe on an absent item', () => {
    expect(holdsVideoDecoder(undefined)).toBe(false)
  })

  /** A slug the player has never heard of must not be assumed to decode — an
   *  unknown app is far more likely to be a dashboard than a video wall. */
  it('does not count an unknown slug', () => {
    expect(holdsVideoDecoder(app('not-a-real-app'))).toBe(false)
  })
})

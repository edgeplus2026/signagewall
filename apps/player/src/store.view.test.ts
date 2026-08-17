import { afterEach, describe, expect, it } from 'vitest'

import { availabilityOn, online, snapshot, view } from './store'
import type { AppRenderable, PlayerSnapshot, Renderable } from './types'

function snap(items: Renderable[]): PlayerSnapshot {
  return { screenId: 's', name: 'screen', revision: 'r1', items }
}

/** A live emergency alert, as the backend puts it in the snapshot's overlays. */
const alertOverlay: AppRenderable = {
  id: 'alert-1',
  kind: 'app',
  slug: 'alert',
  config: { headline: 'Evacuate the building' },
  durationMs: 0,
}

/** The ticker band — an overlay, but NOT a takeover. */
const tickerOverlay: AppRenderable = {
  id: 'ticker-1',
  kind: 'app',
  slug: 'ticker',
  config: {},
  durationMs: 0,
}

const image: Renderable = {
  id: 'img',
  kind: 'image',
  url: 'https://cdn.test/a.webp',
  durationMs: 2000,
}
/** YouTube is a network-only app (manifest `requiresNetwork`). */
const youtube: Renderable = {
  id: 'yt',
  kind: 'app',
  slug: 'youtube',
  config: {},
  durationMs: 2000,
}

// Reset the shared signals after each case so order doesn't leak state.
afterEach(() => {
  snapshot.value = null
  online.value = true
  availabilityOn.value = true
})

describe('view (connectivity-aware content gating)', () => {
  it('plays when there is offline-safe content, online or not', () => {
    snapshot.value = snap([image, youtube])
    online.value = true
    expect(view.value).toBe('playing')
    online.value = false
    // The image still plays; the engine stays mounted and just skips YouTube.
    expect(view.value).toBe('playing')
  })

  it('shows the splash when every item needs network and we go offline', () => {
    snapshot.value = snap([youtube])
    online.value = true
    expect(view.value).toBe('playing')
    // Offline: nothing is playable, so fall back to the branded splash (never a
    // frozen/black frame) — and the engine unmounts, stopping any media.
    online.value = false
    expect(view.value).toBe('pairing')
    // Reconnect flips straight back to playing — no reload.
    online.value = true
    expect(view.value).toBe('playing')
  })

  it('standby wins over content regardless of connectivity', () => {
    snapshot.value = snap([image])
    availabilityOn.value = false
    expect(view.value).toBe('standby')
    online.value = false
    expect(view.value).toBe('standby')
  })

  it('an emergency takeover beats content', () => {
    snapshot.value = { ...snap([image]), overlays: [alertOverlay] }
    expect(view.value).toBe('emergency')
  })

  it('an emergency takeover beats STANDBY — a dark screen must light up', () => {
    // The whole point: a shop that is shut is exactly the screen an evacuation
    // notice needs to reach.
    snapshot.value = { ...snap([image]), overlays: [alertOverlay] }
    availabilityOn.value = false
    expect(view.value).toBe('emergency')
  })

  it('an emergency takeover shows even with nothing playable', () => {
    snapshot.value = { ...snap([]), overlays: [alertOverlay] }
    expect(view.value).toBe('emergency')
  })

  it('the ticker band is an overlay but never a takeover', () => {
    snapshot.value = { ...snap([image]), overlays: [tickerOverlay] }
    expect(view.value).toBe('playing')
    availabilityOn.value = false
    expect(view.value).toBe('standby')
  })
})

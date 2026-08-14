import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PlayerCommand } from '../types'

const restartPlayer = vi.fn()
const playbackNext = vi.fn()
const playbackPrevious = vi.fn()

vi.mock('../restart', () => ({ restartPlayer }))
vi.mock('./playback-bus', () => ({
  playbackNext,
  playbackPrevious,
  playbackShowItem: vi.fn(),
  registerPlaybackControls: vi.fn(),
}))

// Imported after the mocks so commands.ts binds to the stubbed leaf modules.
const { applyCommand } = await import('./commands')
const { dailyReload, orientation, scale, volume } = await import('../store')

beforeEach(() => {
  vi.clearAllMocks()
  volume.value = 100
  orientation.value = 'landscape'
  scale.value = 'fit'
  dailyReload.value = { enabled: true, time: '03:00' }
})

describe('applyCommand — real device', () => {
  it('applies, rounds and clamps volume', () => {
    applyCommand({ type: 'volume', value: 42.4 })
    expect(volume.value).toBe(42)
    applyCommand({ type: 'volume', value: 200 })
    expect(volume.value).toBe(100)
    applyCommand({ type: 'volume', value: -10 })
    expect(volume.value).toBe(0)
  })

  it('ignores a non-finite volume', () => {
    applyCommand({ type: 'volume', value: Number.NaN })
    expect(volume.value).toBe(100)
  })

  it('applies a known orientation and ignores an unknown one', () => {
    applyCommand({ type: 'orientation', value: 'portrait' })
    expect(orientation.value).toBe('portrait')
    applyCommand({
      type: 'orientation',
      value: 'sideways' as never,
    } as PlayerCommand)
    expect(orientation.value).toBe('portrait')
  })

  it('applies a known scale and ignores an unknown one', () => {
    applyCommand({ type: 'scale', value: 'zoom' })
    expect(scale.value).toBe('zoom')
    applyCommand({ type: 'scale', value: 'huge' as never } as PlayerCommand)
    expect(scale.value).toBe('zoom')
  })

  it('normalizes a malformed daily-reload time', () => {
    applyCommand({
      type: 'dailyReload',
      value: { enabled: true, time: '99:99' },
    })
    expect(dailyReload.value).toEqual({ enabled: true, time: '03:00' })
  })

  it('restarts on a restart command', () => {
    applyCommand({ type: 'restart' })
    expect(restartPlayer).toHaveBeenCalledOnce()
  })

  it('drives next/prev through the playback bus', () => {
    applyCommand({ type: 'next' })
    applyCommand({ type: 'prev' })
    expect(playbackNext).toHaveBeenCalledOnce()
    expect(playbackPrevious).toHaveBeenCalledOnce()
  })
})

describe('applyCommand — preview spectator', () => {
  const preview = { preview: true }

  it('mirrors orientation, scale and next/prev', () => {
    applyCommand({ type: 'orientation', value: 'portrait' }, preview)
    applyCommand({ type: 'scale', value: 'stretch' }, preview)
    applyCommand({ type: 'next' }, preview)
    applyCommand({ type: 'prev' }, preview)
    expect(orientation.value).toBe('portrait')
    expect(scale.value).toBe('stretch')
    expect(playbackNext).toHaveBeenCalledOnce()
    expect(playbackPrevious).toHaveBeenCalledOnce()
  })

  it('ignores device-only commands (volume, restart, dailyReload)', () => {
    applyCommand({ type: 'volume', value: 50 }, preview)
    applyCommand({ type: 'restart' }, preview)
    applyCommand(
      { type: 'dailyReload', value: { enabled: false, time: '04:00' } },
      preview,
    )
    expect(volume.value).toBe(100)
    expect(restartPlayer).not.toHaveBeenCalled()
    expect(dailyReload.value).toEqual({ enabled: true, time: '03:00' })
  })
})

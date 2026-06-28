import {
  setStoredDailyReload,
  setStoredOrientation,
  setStoredScale,
  setStoredVolume,
} from '../device'
import { isOrientation, isScale, normalizeDailyReload } from '../device-settings'
import { restartPlayer } from '../restart'
import {
  dailyReload,
  orientation,
  scale,
  volume,
} from '../store'
import type {
  DailyReloadSetting,
  DeviceOrientation,
  DeviceScale,
  DeviceSettings,
  PlayerCommand,
} from '../types'
import { playbackNext, playbackPrevious } from './playback-bus'

/** Applies + persists a new volume (0–100), ignoring out-of-range values. */
export function applyVolume(next: number): void {
  if (!Number.isFinite(next)) {
    return
  }
  const clamped = Math.min(100, Math.max(0, Math.round(next)))
  volume.value = clamped
  setStoredVolume(clamped)
}

/** Applies + persists an orientation, ignoring unknown values. */
export function applyOrientation(next: DeviceOrientation): void {
  if (!isOrientation(next)) {
    return
  }
  orientation.value = next
  setStoredOrientation(next)
}

/** Applies + persists a content scale, ignoring unknown values. */
export function applyScale(next: DeviceScale): void {
  if (!isScale(next)) {
    return
  }
  scale.value = next
  setStoredScale(next)
}

/**
 * Applies + persists the daily-reload setting. Normalizes first so a malformed
 * time falls back to the default without dropping the `enabled` flag (a disable
 * with a bad time still disables). The scheduler reacts to the `dailyReload`
 * signal (see startDailyReload), so updating it here rebases the loop.
 */
export function applyDailyReload(next: DailyReloadSetting): void {
  const normalized = normalizeDailyReload(next)
  dailyReload.value = normalized
  setStoredDailyReload(normalized)
}

/** Applies all display + power settings delivered on (re)connect / pair. */
export function applySettings(settings: DeviceSettings): void {
  applyOrientation(settings.orientation)
  applyScale(settings.scale)
  applyDailyReload(settings.dailyReload)
}

export interface ApplyCommandOptions {
  /**
   * A CMS preview spectator mirrors only the live display state — orientation,
   * scale, and remote next/prev. It ignores the device-only commands (volume is
   * forced muted; restart and daily-reload belong to the physical device).
   */
  preview?: boolean
}

/**
 * Single dispatch for a live {@link PlayerCommand}, shared by the real device
 * and the CMS preview spectator so the two can't drift. Unknown command types
 * are ignored.
 */
export function applyCommand(
  command: PlayerCommand,
  options: ApplyCommandOptions = {},
): void {
  switch (command?.type) {
    case 'orientation':
      applyOrientation(command.value)
      break
    case 'scale':
      applyScale(command.value)
      break
    case 'next':
      playbackNext()
      break
    case 'prev':
      playbackPrevious()
      break
    // Device-only below — a preview never adopts these.
    case 'volume':
      if (!options.preview) {
        applyVolume(command.value)
      }
      break
    case 'dailyReload':
      if (!options.preview) {
        applyDailyReload(command.value)
      }
      break
    case 'restart':
      if (!options.preview) {
        restartPlayer()
      }
      break
    default:
      break
  }
}

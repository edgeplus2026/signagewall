import { endOfWeek, startOfWeek, subDays, subWeeks } from 'date-fns'
import { useContext, useMemo } from 'react'

import { useAllMediaFiles } from '@/features/media/hooks/useMedia'
import { usePlaylists } from '@/features/playlists/hooks/usePlaylists'
import type { PlaylistSummary } from '@/features/playlists/types/playlist.types'
import { useScreens } from '@/features/screens/hooks/useScreens'
import { PresenceContext } from '@/features/screens/providers/presenceContext'

/** How many weekly buckets the content-growth chart looks back over. */
const GROWTH_WEEKS = 12
/** Window (days) used for the "added recently" delta pills. */
const DELTA_WINDOW_DAYS = 7

export interface GrowthPoint {
  /** Epoch ms of the Monday that starts the week — the chart formats it locally. */
  weekStart: number
  screens: number
  playlists: number
  media: number
  total: number
}

/** One screen's health row for the fleet panel, problem-first ordered. */
export interface FleetScreen {
  id: string
  name: string
  /** False when the screen has no bound device at all (setup incomplete). */
  paired: boolean
  online: boolean
  lastSeenAt?: string
  platform?: string
  appVersion?: string
}

export interface DashboardData {
  isLoading: boolean
  /** True when any of the underlying list queries failed. */
  isError: boolean
  /** Re-runs the failed queries. */
  retry: () => void
  counts: {
    screens: number
    playlists: number
    media: number
    images: number
    videos: number
  }
  /** Total size of the media library in bytes (files that report a size). */
  storageBytes: number
  presence: {
    total: number
    online: number
    offline: number
  }
  /** Items created within the last {@link DELTA_WINDOW_DAYS} days. */
  deltas: {
    screens: number
    playlists: number
    media: number
  }
  growth: GrowthPoint[]
  recentPlaylists: PlaylistSummary[]
  /** Per-screen health, offline-longest first, then unpaired, then online. */
  fleet: FleetScreen[]
}

function toTime(iso: string): number {
  const t = new Date(iso).getTime()
  return Number.isNaN(t) ? 0 : t
}

function countCreatedWithin(times: number[], since: number): number {
  return times.reduce((count, t) => (t >= since ? count + 1 : count), 0)
}

function countCreatedUpTo(times: number[], cutoff: number): number {
  return times.reduce((count, t) => (t > 0 && t <= cutoff ? count + 1 : count), 0)
}

export function useDashboardData(): DashboardData {
  const {
    data: playlists = [],
    isLoading: playlistsLoading,
    isError: playlistsError,
    refetch: refetchPlaylists,
  } = usePlaylists()
  const {
    data: screens = [],
    isLoading: screensLoading,
    isError: screensError,
    refetch: refetchScreens,
  } = useScreens()
  const {
    data: media = [],
    isLoading: mediaLoading,
    isError: mediaError,
    refetch: refetchMedia,
  } = useAllMediaFiles()
  const presenceMap = useContext(PresenceContext)

  return useMemo(() => {
    const screenTimes = screens.map((s) => toTime(s.createdAt))
    const playlistTimes = playlists.map((p) => toTime(p.createdAt))
    const mediaTimes = media.map((m) => toTime(m.createdAt))

    const images = media.filter((m) => m.type === 'image').length
    const videos = media.filter((m) => m.type === 'video').length
    const storageBytes = media.reduce((sum, m) => sum + (m.size ?? 0), 0)

    const devices = Object.values(presenceMap)
    const online = devices.filter((d) => d.online).length
    const total = screens.length
    const offline = Math.max(0, total - online)

    const now = new Date()
    const deltaSince = subDays(now, DELTA_WINDOW_DAYS).getTime()

    const growth: GrowthPoint[] = []
    for (let i = GROWTH_WEEKS - 1; i >= 0; i--) {
      const weekDate = subWeeks(now, i)
      const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 })
      const cutoff = endOfWeek(weekDate, { weekStartsOn: 1 }).getTime()

      const screensCum = countCreatedUpTo(screenTimes, cutoff)
      const playlistsCum = countCreatedUpTo(playlistTimes, cutoff)
      const mediaCum = countCreatedUpTo(mediaTimes, cutoff)

      growth.push({
        // Past buckets are labelled by the week's Monday; the current (last) bucket
        // is labelled as of today so the newest point reads as "now", not a stale
        // start-of-week date.
        weekStart: i === 0 ? now.getTime() : weekStart.getTime(),
        screens: screensCum,
        playlists: playlistsCum,
        media: mediaCum,
        total: screensCum + playlistsCum + mediaCum,
      })
    }

    const recentPlaylists = [...playlists]
      .sort((a, b) => toTime(b.updatedAt) - toTime(a.updatedAt))
      .slice(0, 5)

    // Problem-first: a dead paired display (longest down first) outranks a
    // never-paired screen, which outranks everything healthy.
    const fleetRank = (s: FleetScreen) => (s.paired && !s.online ? 0 : s.paired ? 2 : 1)
    const fleet: FleetScreen[] = screens
      .map((screen) => {
        const presence = presenceMap[screen.id]
        return {
          id: screen.id,
          name: screen.name,
          paired: Boolean(presence?.paired),
          online: presence?.online === true,
          ...(presence?.lastSeenAt ? { lastSeenAt: presence.lastSeenAt } : {}),
          ...(presence?.profile?.platform ? { platform: presence.profile.platform } : {}),
          ...(presence?.profile?.appVersion ? { appVersion: presence.profile.appVersion } : {}),
        }
      })
      .sort((a, b) => {
        const rank = fleetRank(a) - fleetRank(b)
        if (rank !== 0) return rank
        if (fleetRank(a) === 0) {
          return toTime(a.lastSeenAt ?? '') - toTime(b.lastSeenAt ?? '')
        }
        return a.name.localeCompare(b.name)
      })

    return {
      isLoading: playlistsLoading || screensLoading || mediaLoading,
      isError: playlistsError || screensError || mediaError,
      retry: () => {
        if (playlistsError) void refetchPlaylists()
        if (screensError) void refetchScreens()
        if (mediaError) void refetchMedia()
      },
      counts: {
        screens: total,
        playlists: playlists.length,
        media: media.length,
        images,
        videos,
      },
      storageBytes,
      presence: { total, online, offline },
      deltas: {
        screens: countCreatedWithin(screenTimes, deltaSince),
        playlists: countCreatedWithin(playlistTimes, deltaSince),
        media: countCreatedWithin(mediaTimes, deltaSince),
      },
      growth,
      recentPlaylists,
      fleet,
    }
  }, [
    playlists,
    screens,
    media,
    presenceMap,
    playlistsLoading,
    screensLoading,
    mediaLoading,
    playlistsError,
    screensError,
    mediaError,
    refetchPlaylists,
    refetchScreens,
    refetchMedia,
  ])
}

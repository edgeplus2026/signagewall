import { useState } from 'react'

type ViewMode = 'grid' | 'list'

const STORAGE_KEYS = {
  screens: 'viewMode:screens',
  playlists: 'viewMode:playlists',
  media: 'viewMode:media',
} as const

type ViewModeKey = keyof typeof STORAGE_KEYS

function readViewMode(key: ViewModeKey): ViewMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS[key])
    if (stored === 'grid' || stored === 'list') return stored
  } catch {
    // ignore
  }
  return 'grid'
}

export function useViewMode(key: ViewModeKey) {
  const [viewMode, setViewModeState] = useState<ViewMode>(() => readViewMode(key))

  function setViewMode(mode: ViewMode) {
    try {
      localStorage.setItem(STORAGE_KEYS[key], mode)
    } catch {
      // ignore
    }
    setViewModeState(mode)
  }

  return [viewMode, setViewMode] as const
}

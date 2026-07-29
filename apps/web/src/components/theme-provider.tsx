'use client'

import { useServerInsertedHTML } from 'next/navigation'
import { useCallback, useEffect, useSyncExternalStore, type ReactNode } from 'react'

export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

/**
 * Applied pre-paint, before React runs, so the page never flashes the wrong
 * theme. It lives beside the provider that has to agree with it — the storage
 * key and the class name are the contract between them.
 */
const themeInitScript = `(()=>{try{var s=localStorage.getItem(${JSON.stringify(
  STORAGE_KEY,
)});var d=s==="dark"||((!s||s==="system")&&matchMedia(${JSON.stringify(
  DARK_QUERY,
)}).matches);var e=document.documentElement;e.classList.toggle("dark",d);e.style.colorScheme=d?"dark":"light"}catch(_){}})()`

/**
 * Puts the init script into <head> at SSR flush time and renders nothing into
 * the tree. A plain <script> in the layout would be re-rendered by React on any
 * client navigation that re-runs the layout — switching locale does, since the
 * locale *is* the root segment — and React 19 errors on that, because a script
 * created during a client render never executes. Inserted server-side it is
 * ordinary HTML, so it does run, and it runs before the body paints.
 */
export function ThemeInit() {
  useServerInsertedHTML(() => (
    <script id="theme-init" dangerouslySetInnerHTML={{ __html: themeInitScript }} />
  ))
  return null
}

/* A module-level store rather than context + state: the source of truth is
   localStorage and a media query, both of which live outside React. Reading
   them through useSyncExternalStore also keeps hydration honest — React uses
   the server snapshot for the first paint and swaps in the real one after. */
const listeners = new Set<() => void>()

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  const query = window.matchMedia(DARK_QUERY)
  query.addEventListener('change', onChange)
  // `storage` only fires in *other* tabs, which is exactly the case our own
  // setTheme can't cover.
  window.addEventListener('storage', onChange)
  return () => {
    listeners.delete(onChange)
    query.removeEventListener('change', onChange)
    window.removeEventListener('storage', onChange)
  }
}

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {
    // Private mode or blocked storage — fall through to the system default.
  }
  return 'system'
}

function readResolved(): 'light' | 'dark' {
  const theme = readTheme()
  if (theme !== 'system') return theme
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

const serverTheme = (): Theme => 'system'
const serverResolved = (): 'light' | 'dark' => 'light'

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, readTheme, serverTheme)
  const resolvedTheme = useSyncExternalStore(subscribe, readResolved, serverResolved)

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // The choice just won't survive a reload.
    }
    for (const listener of listeners) listener()
  }, [])

  return { theme, resolvedTheme, setTheme }
}

/** Keeps <html> in sync with the resolved theme after the init script's head start. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    const el = document.documentElement
    el.classList.toggle('dark', resolvedTheme === 'dark')
    el.style.colorScheme = resolvedTheme
  }, [resolvedTheme])

  return children
}

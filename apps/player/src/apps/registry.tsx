import type { AppRenderProps } from '@edge/apps-contract'
import { type ComponentType, render } from 'preact'

import type { AppRenderable } from '../types'
import type { Surface } from '../engine/slot'
import { YouTubeApp } from './youtube'

type AppComponent = ComponentType<AppRenderProps>

/**
 * Native app components compiled into the player, keyed by manifest slug. Add a
 * new app by mapping its slug to its Preact component. (`embed`-kind apps —
 * sandboxed iframes — are a later addition.)
 */
const REGISTRY: Record<string, AppComponent> = {
  youtube: YouTubeApp,
}

/**
 * Mounts the app for `item` into `host`. Returns false for an unknown slug so
 * the caller can skip the item instead of showing a blank surface.
 */
export function renderApp(
  host: HTMLElement,
  item: AppRenderable,
  surface: Surface,
): boolean {
  const Component = REGISTRY[item.slug]
  if (!Component) {
    return false
  }

  render(
    <Component
      config={item.config}
      data={null}
      surface={surface}
      isPreview={false}
    />,
    host,
  )
  return true
}

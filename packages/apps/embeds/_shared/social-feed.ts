import type { SocialPayload, SocialPost } from '../../src/social/payload.js'
import { type AppDataMeta, connectToHost } from './host-bridge.js'
import { freshnessFooterHtml } from './freshness.js'

/**
 * Shared renderer for the social-feed apps (Instagram, Facebook). Both platforms
 * reduce to "an account and a list of recent posts", so one renderer serves both
 * over the {@link SocialPayload} contract — the calling bundle only supplies its
 * brand (accent, name, glyph). Two layouts:
 *
 *  - `spotlight` (default): one post at a time, big image with the caption over
 *    it, auto-rotating every `slideSeconds`. The signage-friendly default.
 *  - `grid`: a tiled wall of the most recent posts.
 *
 * The rotation is visual only (no audio), so it does not gate on `onActive`; it
 * is re-armed idempotently on every config/data message.
 */

export interface SocialFeedBrand {
  /** Platform name shown in the header (e.g. "Instagram"). */
  platform: string
  /** Brand accent (header bar + chip). */
  accent: string
  /** Inline SVG glyph string for the platform. */
  glyph: string
}

interface SocialConfig {
  layout?: 'spotlight' | 'grid'
  slideSeconds?: number
  showCaption?: boolean
  theme?: 'light' | 'dark'
}

const THEMES: Record<string, { bg: string; text: string; card: string }> = {
  light: { bg: '#FFFFFF', text: '#0F172A', card: '#F1F5F9' },
  dark: { bg: '#0B1220', text: '#E2E8F0', card: '#131C2E' },
}

/** Escape untrusted post text before it goes into innerHTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Clamp a caption to a sensible on-screen length (word boundary). */
function clampText(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim()}…`
}

export function mountSocialFeed(brand: SocialFeedBrand): void {
  const root = document.getElementById('app')
  if (!root) return

  let rotate: number | undefined
  let index = 0
  let state: { config: SocialConfig; data: SocialPayload | null } | null = null
  let currentMeta: AppDataMeta | null = null

  function stopRotation(): void {
    if (rotate !== undefined) {
      clearInterval(rotate)
      rotate = undefined
    }
  }

  function header(accountLabel: string): string {
    return (
      `<header class="sf-head" style="background:${brand.accent}">` +
      `<span class="sf-glyph">${brand.glyph}</span>` +
      `<span class="sf-account">${escapeHtml(accountLabel)}</span>` +
      `<span class="sf-plat">${escapeHtml(brand.platform)}</span>` +
      `</header>`
    )
  }

  function mediaHtml(post: SocialPost, large: boolean): string {
    if (post.imageUrl) {
      const badge =
        post.mediaType === 'video'
          ? '<span class="sf-play" aria-hidden="true">▶</span>'
          : ''
      return (
        `<div class="sf-media">` +
        `<img src="${encodeURI(post.imageUrl)}" alt="" loading="eager" />` +
        badge +
        `</div>`
      )
    }
    // Text-only post (common on Facebook): show the text as the hero itself.
    const text = post.text ? escapeHtml(clampText(post.text, large ? 320 : 140)) : ''
    return `<div class="sf-media sf-media-text"><p>${text}</p></div>`
  }

  function renderSpotlight(
    root: HTMLElement,
    data: SocialPayload,
    showCaption: boolean,
  ): void {
    const post = data.posts[index % data.posts.length]!
    const caption =
      showCaption && post.text && post.imageUrl
        ? `<div class="sf-caption"><p>${escapeHtml(clampText(post.text, 220))}</p></div>`
        : ''
    root.innerHTML =
      header(data.accountLabel) +
      `<div class="sf-spot">${mediaHtml(post, true)}${caption}</div>`
  }

  function renderGrid(
    root: HTMLElement,
    data: SocialPayload,
    showCaption: boolean,
  ): void {
    const cells = data.posts
      .slice(0, 9)
      .map((post) => {
        const cap =
          showCaption && post.text
            ? `<div class="sf-cell-cap">${escapeHtml(clampText(post.text, 90))}</div>`
            : ''
        return `<div class="sf-cell">${mediaHtml(post, false)}${cap}</div>`
      })
      .join('')
    root.innerHTML =
      header(data.accountLabel) + `<div class="sf-grid">${cells}</div>`
  }

  function applyTheme(root: HTMLElement, config: SocialConfig): void {
    const theme = THEMES[String(config.theme)] ?? THEMES.dark!
    root.style.background = theme.bg
    root.style.color = theme.text
    root.style.setProperty('--sf-card', theme.card)
    root.style.setProperty('--sf-accent', brand.accent)
  }

  function render(): void {
    if (!root || !state) return
    stopRotation()
    applyTheme(root, state.config)

    const { config, data } = state
    if (!data || data.posts.length === 0) {
      root.innerHTML =
        header(data?.accountLabel ?? brand.platform) +
        `<div class="sf-empty"><p>No posts yet</p></div>`
      root.insertAdjacentHTML('beforeend', freshnessFooterHtml(currentMeta))
      return
    }

    const layout = config.layout === 'grid' ? 'grid' : 'spotlight'
    const showCaption = config.showCaption !== false

    if (layout === 'grid') {
      renderGrid(root, data, showCaption)
    } else {
      if (index >= data.posts.length) index = 0
      renderSpotlight(root, data, showCaption)
      if (data.posts.length > 1) {
        const seconds = Math.min(Math.max(config.slideSeconds ?? 8, 2), 120)
        rotate = window.setInterval(() => {
          index = (index + 1) % data.posts.length
          renderSpotlight(root, data, showCaption)
          root.insertAdjacentHTML('beforeend', freshnessFooterHtml(currentMeta))
        }, seconds * 1000)
      }
    }
    root.insertAdjacentHTML('beforeend', freshnessFooterHtml(currentMeta))
  }

  connectToHost<SocialConfig, SocialPayload>(({ config, data, meta }) => {
    // A fresh payload re-starts the rotation from the newest post.
    const isNewData = data !== state?.data
    state = { config, data }
    currentMeta = meta
    if (isNewData) index = 0
    render()
  })
}

import '../_shared/base.css'
import '../_shared/social-feed.css'
import { mountSocialFeed } from '../_shared/social-feed.js'

const GLYPH =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 8a3 3 0 1 0 0-.01"/><path d="M4 20v-2a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v2"/><path d="M16 3.5a2.5 2.5 0 1 1 0 5"/><path d="M15 14h4a2 2 0 0 1 2 2v1a3 3 0 0 1-3 3h-1"/></svg>'

mountSocialFeed({
  platform: 'Teams',
  accent: '#6264A7',
  glyph: GLYPH,
})

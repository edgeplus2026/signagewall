import '../_shared/base.css'
import '../_shared/social-feed.css'
import { mountSocialFeed } from '../_shared/social-feed.js'

const GLYPH =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="7.5" cy="7.5" r="1" fill="currentColor" stroke="none"/><path d="M7.5 10.5v7"/><path d="M11.5 17.5v-7"/><path d="M11.5 13.5a2.5 2.5 0 0 1 5 0v4"/></svg>'

mountSocialFeed({
  platform: 'LinkedIn',
  accent: '#0A66C2',
  glyph: GLYPH,
})

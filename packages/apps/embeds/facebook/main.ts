import '../_shared/base.css'
import '../_shared/social-feed.css'
import { mountSocialFeed } from '../_shared/social-feed.js'

const GLYPH =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M15 8h-2a2 2 0 0 0-2 2v2m-2 0h6m-4 0v6"/></svg>'

mountSocialFeed({
  platform: 'Facebook',
  accent: '#1877F2',
  glyph: GLYPH,
})

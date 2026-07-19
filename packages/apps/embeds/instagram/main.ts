import '../_shared/base.css'
import '../_shared/social-feed.css'
import { mountSocialFeed } from '../_shared/social-feed.js'

const GLYPH =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>'

mountSocialFeed({
  platform: 'Instagram',
  // Instagram's signature gradient reads as a CSS background value inline.
  accent: 'linear-gradient(135deg,#F58529 0%,#DD2A7B 50%,#8134AF 100%)',
  glyph: GLYPH,
})

import type { ReactNode } from 'react'

import { Link } from '@/i18n/navigation'

/**
 * Internal links that live inside translated prose.
 *
 * A link list bolted under a paragraph is a different thing from a link inside
 * the sentence that earned it: the sentence supplies the anchor text, and the
 * anchor text is most of what an internal link is worth. Wrapping the phrase in
 * the message keeps that decision with the copy, where a translator can move it
 * to wherever the Serbian sentence puts the idea.
 *
 * Only routes worth linking from prose belong here. The header and the footer
 * already reach every page; this exists for the pages a reader should be handed
 * mid-thought, which is also why `/what-is-digital-signage` and `/hardware`
 * appear — before this file the whole site linked to neither from its copy.
 */
const ROUTES = {
  whatIs: '/what-is-digital-signage',
  howItWorks: '/how-it-works',
  features: '/features',
  pricing: '/pricing',
  hardware: '/hardware',
  apps: '/apps',
  solutions: '/solutions',
  download: '/download',
  blog: '/blog',
} as const

export type CopyLinkTag = keyof typeof ROUTES

/**
 * Tag handlers for `t.rich`. Spread alongside the message's own values:
 * `t.rich('sections.0.body', { ...values, ...copyLinks })`.
 *
 * next-intl throws on a tag with no handler, so passing the whole set to every
 * message is deliberate — a message gains a link by adding the tag to the copy,
 * without the component having to be told about it.
 */
export const copyLinks: Record<CopyLinkTag, (chunks: ReactNode) => ReactNode> = Object.fromEntries(
  Object.entries(ROUTES).map(([tag, href]) => [
    tag,
    (chunks: ReactNode) => <Link href={href}>{chunks}</Link>,
  ]),
) as Record<CopyLinkTag, (chunks: ReactNode) => ReactNode>

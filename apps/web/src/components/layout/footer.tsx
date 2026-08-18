import { getLocale, getTranslations } from 'next-intl/server'

import { Logo } from '@/components/brand/logo'
import { SocialIcon } from '@/components/brand/social-icons'
import { Block } from '@/components/ui/block'
import { Container } from '@/components/ui/container'
import { Link } from '@/i18n/navigation'
import { SOCIAL_PROFILES } from '@/lib/social'
import { listTopSolutions } from '@/lib/solutions'

/* Exactly the routes this footer links to. Wider than that and Link can no
   longer check that a dynamic route was given its params. */
type FooterHref =
  | '/how-it-works'
  | '/features'
  | '/pricing'
  | '/free-digital-signage-software'
  | '/apps'
  | '/download'
  | '/hardware'
  | '/solutions'
  | '/about'
  | '/blog'
  | '/contact'
  | '/privacy'
  | '/terms'
  | '/cookies'
  | '/data-deletion'
  | { pathname: '/solutions/[industry]'; params: { industry: string } }

/** Three fit the column beside "all solutions"; the rest live on /solutions. */
const SOLUTIONS_SHOWN = 3

export async function Footer() {
  const locale = await getLocale()
  const t = await getTranslations('footer')
  const year = new Date().getFullYear()
  /* Named by Payload rather than by a footer-local translation, so a renamed
     industry doesn't keep its old name down here. */
  const solutions = await listTopSolutions(locale, SOLUTIONS_SHOWN)

  /* hrefs are internal routes; `Link` renders each in the current language via
     the pathnames map, so this list never mentions a Serbian URL. */
  const columns: { id: string; title: string; links: { href: FooterHref; label: string }[] }[] = [
    {
      id: 'product',
      title: t('product.title'),
      links: [
        { href: '/how-it-works', label: t('product.howItWorks') },
        { href: '/features', label: t('product.features') },
        { href: '/pricing', label: t('product.pricing') },
        { href: '/free-digital-signage-software', label: t('product.freeSignage') },
        { href: '/apps', label: t('product.apps') },
        { href: '/hardware', label: t('product.hardware') },
        { href: '/download', label: t('product.download') },
      ],
    },
    {
      id: 'solutions',
      title: t('solutions.title'),
      links: [
        ...solutions.map((s) => ({
          href: { pathname: '/solutions/[industry]' as const, params: { industry: s.slug } },
          label: s.name,
        })),
        { href: '/solutions', label: t('solutions.all') },
      ],
    },
    {
      id: 'company',
      title: t('company.title'),
      links: [
        { href: '/about', label: t('company.about') },
        { href: '/blog', label: t('company.blog') },
        { href: '/contact', label: t('company.contact') },
      ],
    },
    {
      id: 'legal',
      title: t('legal.title'),
      links: [
        { href: '/privacy', label: t('legal.privacy') },
        { href: '/terms', label: t('legal.terms') },
        { href: '/cookies', label: t('legal.cookies') },
        { href: '/data-deletion', label: t('legal.dataDeletion') },
      ],
    },
  ]

  return (
    <Block as="footer">
      {/* Two link columns even on the narrowest screen — four short lists
          stacked single-file made the footer taller than the page above it. */}
      <Container className="grid grid-cols-2 gap-x-6 gap-y-12 py-14 md:grid-cols-4 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1fr]">
        <div className="col-span-2 max-w-xs md:col-span-4 lg:col-span-1">
          <Logo />
          <p className="mt-4 text-sm text-secondary">{t('tagline')}</p>
        </div>
        {/* Each column is a named navigation landmark rather than a heading.
            Four identical <h2>s repeated on every page would say nothing about
            the page and would compete with its real section headings, while
            `aria-labelledby` gives screen readers the same name without
            touching the document outline. */}
        {columns.map((col) => (
          <nav key={col.id} aria-labelledby={`footer-${col.id}`} className="flex flex-col gap-3">
            <p
              id={`footer-${col.id}`}
              className="font-heading text-xs font-semibold tracking-widest uppercase"
            >
              {col.title}
            </p>
            {col.links.map((l) => (
              /* w-fit so the hit area hugs the label instead of spanning the
                 whole column — a full-width hover on a link list reads broken. */
              <Link
                key={l.label}
                href={l.href}
                className="w-fit text-sm text-secondary transition-colors hover:text-primary"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        ))}
      </Container>

      <Container>
        {/* Notice and profiles share the bottom rule: side by side once there
            is room, stacked below that rather than squeezed, because four
            icons and a copyright line do not survive the same row on a phone. */}
        <div className="flex flex-col items-center gap-4 border-t border-secondary py-5 sm:flex-row sm:justify-between">
          <p className="text-xs text-secondary">
            © {year} SignageWall. {t('rights')}
          </p>
          <nav aria-label={t('social')} className="flex items-center gap-5">
            {SOCIAL_PROFILES.map((profile) => (
              /* `rel="me"` is the link's half of the identity claim that
                 `Organization.sameAs` makes from the other direction: the site
                 vouches for the profile, and the profile links back to the
                 site. The platform name is the accessible name — the glyph
                 alone leaves a screen reader with nothing to announce. */
              <a
                key={profile.name}
                href={profile.url}
                target="_blank"
                rel="me noopener noreferrer"
                className="text-secondary transition-colors hover:text-primary"
              >
                <SocialIcon platform={profile.name} className="size-5" />
                <span className="sr-only">{profile.name}</span>
              </a>
            ))}
          </nav>
        </div>
      </Container>
    </Block>
  )
}

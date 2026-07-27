import { getTranslations } from 'next-intl/server'

import { Logo } from '@/components/brand/logo'
import { FacebookIcon, InstagramIcon, LinkedinIcon } from '@/components/brand/social-icons'
import { Block } from '@/components/ui/block'
import { Container } from '@/components/ui/container'
import { Link } from '@/i18n/navigation'

// TODO: point these at the real EdgeRize profiles before launch.
const SOCIALS = [
  { label: 'Instagram', href: 'https://www.instagram.com/edgerize', Icon: InstagramIcon },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/edgerize', Icon: LinkedinIcon },
  { label: 'Facebook', href: 'https://www.facebook.com/edgerize', Icon: FacebookIcon },
]

export async function Footer() {
  const t = await getTranslations('footer')
  const year = new Date().getFullYear()

  const columns = [
    {
      title: t('product.title'),
      links: [
        { href: '/how-it-works', label: t('product.howItWorks') },
        { href: '/features', label: t('product.features') },
        { href: '/apps', label: t('product.apps') },
        { href: '/download', label: t('product.download') },
      ],
    },
    {
      title: t('solutions.title'),
      links: [
        { href: '/solutions/hospitality', label: t('solutions.hospitality') },
        { href: '/solutions/retail', label: t('solutions.retail') },
        { href: '/solutions/office', label: t('solutions.office') },
        { href: '/solutions', label: t('solutions.all') },
      ],
    },
    {
      title: t('company.title'),
      links: [
        { href: '/about', label: t('company.about') },
        { href: '/blog', label: t('company.blog') },
        { href: '/contact', label: t('company.contact') },
      ],
    },
    {
      title: t('legal.title'),
      links: [
        { href: '/privacy', label: t('legal.privacy') },
        { href: '/terms', label: t('legal.terms') },
        { href: '/cookies', label: t('legal.cookies') },
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
        {columns.map((col) => (
          <div key={col.title} className="flex flex-col gap-3">
            <p className="font-heading text-xs font-semibold tracking-widest uppercase">
              {col.title}
            </p>
            {col.links.map((l) => (
              /* w-fit so the hit area hugs the label instead of spanning the
                 whole column — a full-width hover on a link list reads broken. */
              <Link
                key={l.href}
                href={l.href}
                className="w-fit text-sm text-secondary transition-colors hover:text-primary"
              >
                {l.label}
              </Link>
            ))}
          </div>
        ))}
      </Container>

      <Container>
        {/* Three tracks so the notice sits on the true centre line; the empty
            first track is what balances the socials on the right. */}
        <div className="grid gap-4 border-t border-secondary py-5 sm:grid-cols-3 sm:items-center">
          <div className="hidden sm:block" />
          <p className="text-center text-xs text-secondary">
            © {year} EdgeRize. {t('rights')}
          </p>
          <div className="flex items-center justify-center gap-1 sm:justify-end">
            {SOCIALS.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="flex size-9 items-center justify-center text-secondary transition-colors hover:bg-highlight hover:text-primary"
              >
                <Icon className="size-4.5" />
              </a>
            ))}
          </div>
        </div>
      </Container>
    </Block>
  )
}

import { getTranslations } from 'next-intl/server'

import { Logo } from '@/components/brand/logo'
import { LanguageSwitcher } from '@/components/layout/language-switcher'
import { MobileNav } from '@/components/layout/mobile-nav'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { Block } from '@/components/ui/block'
import { buttonVariants } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

export async function Header() {
  const t = await getTranslations('nav')

  const links = [
    { href: '/how-it-works', label: t('howItWorks') },
    { href: '/features', label: t('features') },
    { href: '/apps', label: t('apps') },
    { href: '/solutions', label: t('solutions') },
    { href: '/blog', label: t('blog') },
  ]

  return (
    /* Stickiness lives on the wrapper in the layout, which carries the leading
       hatch band along with it. */
    <Block as="header" className="bg-page/85 backdrop-blur">
      {/* Three columns on wide viewports so the nav sits dead centre between the
          rails, with the logo and the action anchoring each edge. */}
      <Container className="flex h-16 items-center justify-between gap-6 lg:grid lg:grid-cols-[1fr_auto_1fr]">
        <Link href="/" aria-label="EdgeRize" className="lg:justify-self-start">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-secondary lg:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-primary">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 lg:justify-self-end">
          <div className="hidden items-center gap-1 lg:flex">
            <LanguageSwitcher />
            <ThemeToggle />
            <Link href="/contact" className={cn(buttonVariants({ size: 'sm' }), 'ml-2 h-10 px-5')}>
              {t('getStarted')}
            </Link>
          </div>
          <MobileNav links={links} ctaLabel={t('getStarted')} />
        </div>
      </Container>
    </Block>
  )
}

import { ArrowRight } from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'

import { SectionHeader } from '@/components/marketing/section-header'
import { Reveal } from '@/components/motion/reveal'
import { SolutionIcon } from '@/components/solutions/solution-icon'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Section } from '@/components/ui/section'
import { Subtitle } from '@/components/ui/typography'
import { Link } from '@/i18n/navigation'
import { listTopSolutions } from '@/lib/solutions'
import { cn } from '@/lib/utils'

/** Two full rows of the three-column grid; the other industries live on /solutions. */
const SHOWN = 6

export async function UseCases() {
  const locale = await getLocale()
  const t = await getTranslations('home.useCases')
  const tc = await getTranslations('common')
  /* The industries come from Payload, same as /solutions — a second hand-kept
     copy on the home page is a copy that goes stale the first time an editor
     renames one. */
  const solutions = await listTopSolutions(locale, SHOWN)

  return (
    <Section tone="panel">
      <SectionHeader
        eyebrow={t('eyebrow')}
        title={t('title')}
        subtitle={t('subtitle')}
        action={
          <Link href="/solutions" className={cn(buttonVariants({ variant: 'outline' }))}>
            {t('cta')}
          </Link>
        }
      />

      <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {solutions.map((s, i) => (
          <Reveal key={s.slug} delay={(i % 3) * 80}>
            <Link
              href={{ pathname: '/solutions/[industry]', params: { industry: s.slug } }}
              className="block h-full"
            >
              <Card className="group flex h-full flex-col bg-page transition-colors hover:border-accent">
                <SolutionIcon
                  icon={s.icon}
                  className="size-6 text-secondary transition-colors group-hover:text-accent"
                />
                <Subtitle className="mt-6">{s.name}</Subtitle>
                {/* Taglines are written for the industry page, where they get a
                    full card to themselves — clamped here so six of them don't
                    turn the section into a wall of prose. */}
                <p className="mt-3 line-clamp-3 text-sm text-pretty text-secondary">{s.tagline}</p>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-medium transition-colors group-hover:text-accent">
                  {tc('learnMore')}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Card>
            </Link>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}

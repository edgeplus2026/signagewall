import type { ReactNode } from 'react'

import { Reveal } from '@/components/motion/reveal'
import { Section } from '@/components/ui/section'
import { Eyebrow, Heading, Lead } from '@/components/ui/typography'

interface PageHeroProps {
  eyebrow?: string
  title: string
  subtitle?: string
  children?: ReactNode
}

/** Inner-page hero: the first plate on the stack — dotted backdrop, H1, lead. */
export function PageHero({ eyebrow, title, subtitle, children }: PageHeroProps) {
  return (
    <Section>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute inset-x-0 top-0 h-90 mask-[radial-gradient(60%_60%_at_50%_0%,#000,transparent)] opacity-60"
          style={{
            backgroundImage: 'radial-gradient(var(--border-secondary) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />
      </div>
      <Reveal className="max-w-3xl">
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <Heading className={eyebrow ? 'mt-5' : undefined}>{title}</Heading>
        {subtitle ? <Lead className="mt-6 max-w-2xl">{subtitle}</Lead> : null}
        {children ? <div className="mt-9 flex flex-wrap items-center gap-3">{children}</div> : null}
      </Reveal>
    </Section>
  )
}

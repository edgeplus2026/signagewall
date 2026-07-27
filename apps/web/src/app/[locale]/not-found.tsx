import { buttonVariants } from '@/components/ui/button'
import { Section } from '@/components/ui/section'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

export default function NotFound() {
  return (
    <Section className="flex-1" innerClassName="flex flex-col items-start gap-5">
      <p className="font-heading text-7xl font-semibold tracking-tight">404</p>
      <p className="text-secondary">Stranica nije pronađena · Page not found</p>
      <Link href="/" className={cn(buttonVariants({ variant: 'outline' }))}>
        EdgeRize
      </Link>
    </Section>
  )
}

'use client'

import { useLocale } from 'next-intl'
import { useTransition } from 'react'

import { usePathname, useRouter } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { cn } from '@/lib/utils'

export function LocaleSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex items-center gap-0.5 text-sm">
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          disabled={isPending}
          onClick={() => {
            startTransition(() => {
              router.replace(pathname, { locale: l })
            })
          }}
          className={cn(
            'rounded-md px-2 py-1 uppercase transition-colors',
            l === locale ? 'font-medium text-primary' : 'text-secondary hover:text-primary',
          )}
        >
          {l}
        </button>
      ))}
    </div>
  )
}

'use client'

import { Check, Globe } from 'lucide-react'
import { useLocale } from 'next-intl'
import { DropdownMenu } from 'radix-ui'
import { useTransition } from 'react'

import { usePathname, useRouter } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'

// Labelled here so adding a locale is a one-line change (routing.locales drives the list).
const LANGUAGE_LABELS: Record<string, string> = {
  sr: 'Srpski',
  en: 'English',
}

export function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        disabled={isPending}
        aria-label="Promeni jezik"
        className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm text-secondary transition-colors outline-none hover:bg-highlight hover:text-primary focus-visible:ring-2 focus-visible:ring-tertiary"
      >
        <Globe className="size-4" />
        <span className="uppercase">{locale}</span>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-40 rounded-lg border border-secondary bg-panel-raised p-1 shadow-lg shadow-black/5 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          {routing.locales.map((l) => (
            <DropdownMenu.Item
              key={l}
              onSelect={() => {
                startTransition(() => {
                  router.replace(pathname, { locale: l })
                })
              }}
              className="flex cursor-pointer items-center justify-between gap-4 rounded-md px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-highlight"
            >
              <span>{LANGUAGE_LABELS[l] ?? l}</span>
              {l === locale && <Check className="size-4" />}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

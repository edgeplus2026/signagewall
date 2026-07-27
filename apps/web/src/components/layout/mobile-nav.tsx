'use client'

import { Menu, X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { useState } from 'react'

import { Logo } from '@/components/brand/logo'
import { LanguageSwitcher } from '@/components/layout/language-switcher'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { buttonVariants } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

interface NavLink {
  href: string
  label: string
}

export function MobileNav({ links, ctaLabel }: { links: NavLink[]; ctaLabel: string }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        aria-label="Otvori meni"
        className="inline-flex size-10 items-center justify-center rounded-md text-primary hover:bg-highlight lg:hidden"
      >
        <Menu className="size-5" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xs flex-col border-l border-secondary bg-page p-5 shadow-2xl data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:animate-in data-[state=open]:slide-in-from-right">
          <div className="flex items-center justify-between">
            <Logo />
            <Dialog.Close
              aria-label="Zatvori meni"
              className="inline-flex size-10 items-center justify-center rounded-md text-secondary hover:bg-highlight hover:text-primary"
            >
              <X className="size-5" />
            </Dialog.Close>
          </div>
          <Dialog.Title className="sr-only">Meni</Dialog.Title>

          <nav className="mt-6 flex flex-col">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => {
                  setOpen(false)
                }}
                className="border-b border-secondary py-3.5 text-base text-secondary transition-colors hover:text-primary"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="mt-6 flex items-center justify-between">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>

          <Link
            href="/contact"
            onClick={() => {
              setOpen(false)
            }}
            className={cn(buttonVariants({ size: 'lg' }), 'mt-4 w-full')}
          >
            {ctaLabel}
          </Link>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

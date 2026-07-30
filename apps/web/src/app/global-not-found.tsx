import { GeistSans } from 'geist/font/sans'
import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import Link from 'next/link'

import { ScreenWall404 } from '@/components/brand/screen-wall-404'

import './globals.css'

/* Loaded here rather than inherited: this file renders its own document, so
   nothing in the layout chain runs and the headline font has to come from
   somewhere. */
const manrope = Manrope({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-manrope',
  display: 'swap',
})

export const metadata: Metadata = {
  title: '404',
  robots: { index: false, follow: true },
}

// Next 16 global 404 — renders its own document because it may be shown for
// requests that never reach the localized `[locale]` layout. That also means
// there is no request locale to translate against, so it stays bilingual:
// English leads because it is the default locale, Serbian follows.
export default function GlobalNotFound() {
  return (
    <html lang="en" className={`${GeistSans.variable} ${manrope.variable}`}>
      <body className="bg-page text-primary">
        <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center gap-10 px-6 py-16">
          <ScreenWall404 className="w-full max-w-md" />
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="font-heading text-xs font-semibold tracking-widest text-secondary uppercase">
              404
            </p>
            <h1 className="font-heading text-3xl font-semibold tracking-tight">Page not found</h1>
            <p className="text-secondary" lang="sr">
              Stranica nije pronađena
            </p>
            <Link
              href="/"
              className="mt-2 border border-secondary px-5 py-2.5 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
            >
              SignageWall
            </Link>
          </div>
        </main>
      </body>
    </html>
  )
}

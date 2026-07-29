import { GeistSans } from 'geist/font/sans'
import type { Metadata } from 'next'
import Link from 'next/link'

import './globals.css'

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
    <html lang="en" className={GeistSans.variable}>
      <body className="bg-page text-primary">
        <main className="mx-auto flex min-h-dvh max-w-6xl flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="font-sans text-6xl font-medium">404</p>
          <h1 className="font-sans text-2xl font-medium">Page not found</h1>
          <p className="text-secondary" lang="sr">
            Stranica nije pronađena
          </p>
          <Link href="/" className="underline underline-offset-4">
            SignageWall
          </Link>
        </main>
      </body>
    </html>
  )
}

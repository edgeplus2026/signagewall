import { GeistSans } from 'geist/font/sans'
import Link from 'next/link'

import './globals.css'

// Next 16 global 404 — renders its own document because it may be shown for
// requests that never reach the localized `[locale]` layout.
export default function GlobalNotFound() {
  return (
    <html lang="sr" className={GeistSans.variable}>
      <body className="bg-page text-primary">
        <main className="mx-auto flex min-h-dvh max-w-6xl flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="font-sans text-6xl font-medium">404</p>
          <p className="text-secondary">Stranica nije pronađena · Page not found</p>
          <Link href="/" className="underline underline-offset-4">
            EdgeRize
          </Link>
        </main>
      </body>
    </html>
  )
}

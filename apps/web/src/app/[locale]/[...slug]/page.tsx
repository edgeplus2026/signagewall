import { notFound } from 'next/navigation'

import {
  executeContentRedirect,
  findContentRedirect,
  type ContentSearchParams,
} from '@/lib/redirects'

interface PageProps {
  params: Promise<{ locale: string; slug: string[] }>
  searchParams: Promise<ContentSearchParams>
}

/**
 * Exact database-backed redirects for retired top-level content paths, and the
 * 404 for everything else.
 *
 * This was a Route Handler, which made every unmatched URL on the site answer
 * 404 with an empty body: `notFound()` only renders `not-found.tsx` from a page
 * or layout, and a handler has no such tree to fall back into. A visitor who
 * mistyped a path got a blank window and no way back.
 *
 * As a page it does the same lookup and hands the redirect to the same helper
 * the Blog, Solutions and Apps detail routes use, so all four behave alike —
 * and a miss now renders the real 404.
 */
export default async function CatchAllPage({ params, searchParams }: PageProps) {
  const { locale, slug } = await params
  const localePrefix = locale === 'sr' ? '/sr' : ''
  const publicPath = `${localePrefix}/${slug.map(encodeURIComponent).join('/')}`

  const redirect = await findContentRedirect(publicPath)
  if (redirect) executeContentRedirect(redirect, await searchParams)

  notFound()
}

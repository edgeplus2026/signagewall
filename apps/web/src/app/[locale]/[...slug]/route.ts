import { notFound } from 'next/navigation'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { findContentRedirect } from '@/lib/redirects'

interface RouteContext {
  params: Promise<{ locale: string; slug: string[] }>
}

/**
 * Exact database-backed redirects for retired top-level content paths.
 *
 * Specific pages and detail routes win over this catch-all. Their own miss
 * paths also consult the same collection, which is necessary because a matched
 * dynamic page does not fall through to a catch-all after calling notFound().
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const { locale, slug } = await params
  const localePrefix = locale === 'sr' ? '/sr' : ''
  const publicPath = `${localePrefix}/${slug.map(encodeURIComponent).join('/')}`
  const redirect = await findContentRedirect(publicPath)
  if (!redirect) notFound()

  const destination = new URL(redirect.toPath, request.url)
  destination.search = redirect.preserveQuery ? request.nextUrl.search : ''
  return NextResponse.redirect(destination, redirect.statusCode)
}

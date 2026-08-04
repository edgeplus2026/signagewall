import createMiddleware from 'next-intl/middleware'

import { routing } from '@/i18n/routing'

// Next 16 renamed `middleware.ts` → `proxy.ts`.
// `alternateLinks` is off; the reason lives with the rest of the routing config.
export default createMiddleware(routing)

export const config = {
  matcher: [
    // Skip Next internals, API routes, and the (reserved) Payload `/admin` + `/api`
    // route group (Phase 3), plus anything with a file extension.
    '/((?!api|admin|_next|_vercel|.*\\..*).*)',
    /* The extension exclusion above also caught the one public URL that is
       meant to have one. Without the locale prefix that `localePrefix:
       'as-needed'` strips from English URLs, `/blog/feed.xml` never reached
       `app/[locale]/blog/feed.xml` and answered 404 — so the English feed was
       unreachable while the Serbian one, already carrying its prefix, worked. */
    '/blog/feed.xml',
  ],
}

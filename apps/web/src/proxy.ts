import createMiddleware from 'next-intl/middleware'

import { routing } from '@/i18n/routing'

// Next 16 renamed `middleware.ts` → `proxy.ts`.
export default createMiddleware(routing)

export const config = {
  // Skip Next internals, API routes, and the (reserved) Payload `/admin` + `/api`
  // route group (Phase 3), plus anything with a file extension.
  matcher: ['/((?!api|admin|_next|_vercel|.*\\..*).*)'],
}

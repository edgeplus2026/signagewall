/**
 * The signage app (@signagewall/cms) is a separate origin, so its routes are plain
 * `<a href>` targets — next-intl's `Link` would prefix them with a locale and
 * route them through this site's router.
 */
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:5173'

export const LOGIN_URL = `${appUrl}/login`
export const REGISTER_URL = `${appUrl}/register`

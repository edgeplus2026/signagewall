import type { LegalDocType } from '@/features/legal/types/legal.types'

/**
 * Public URLs of the legal documents, on the marketing site.
 *
 * The text used to be fetched from `GET /legal/documents` and rendered inside
 * the dashboard, which meant the only copy of the Terms lived behind a login
 * and had no URL anyone could link to or index. The website is now where the
 * documents are published; the backend keeps the version number and the record
 * of who accepted what, and no longer needs to be the thing that displays them.
 *
 * The paths are localised — see `apps/web/src/i18n/routing.ts`.
 */
const WEB_URL = (import.meta.env.VITE_WEB_URL as string | undefined) ?? 'https://www.signagewall.com'

const PATHS: Record<LegalDocType | 'cookies', { sr: string; en: string }> = {
  tos: { sr: '/uslovi-koriscenja', en: '/en/terms' },
  privacy: { sr: '/politika-privatnosti', en: '/en/privacy' },
  cookies: { sr: '/kolacici', en: '/en/cookies' },
}

export function legalUrl(doc: LegalDocType | 'cookies', language: string): string {
  const locale = language.startsWith('sr') ? 'sr' : 'en'
  return `${WEB_URL.replace(/\/+$/, '')}${PATHS[doc][locale]}`
}

import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['sr', 'en'],
  defaultLocale: 'sr',
  // `/` = Serbian (no prefix), `/en` = English.
  localePrefix: 'as-needed',
})

export type Locale = (typeof routing.locales)[number]

import { hasLocale } from 'next-intl'
import { getRequestConfig } from 'next-intl/server'

import enMessages from './messages/en'
import srMessages from './messages/sr'
import { routing } from './routing'

const MESSAGES = { sr: srMessages, en: enMessages }

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale

  return {
    locale,
    messages: MESSAGES[locale],
  }
})

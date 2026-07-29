import * as Sentry from '@sentry/browser'

import { config } from './config'

/**
 * Crash/exception visibility for screens we can't physically inspect. No-op
 * unless a DSN is configured, so local/dev runs stay quiet.
 */
export function initSentry(): void {
  if (!config.sentryDsn) {
    return
  }

  Sentry.init({
    dsn: config.sentryDsn,
    release: `signagewall-player@${config.appVersion}`,
    tracesSampleRate: 0,
  })
}

export function reportError(error: unknown, context?: Record<string, unknown>): void {
  if (config.sentryDsn) {
    Sentry.captureException(error, context ? { extra: context } : undefined)
  } else {
    console.error('[player]', error, context)
  }
}

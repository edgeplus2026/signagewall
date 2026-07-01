import type { ConfigSchema, Field } from '@edge/apps-contract'

import type { AppInstanceConfig, EdgeApp } from '@/features/apps/types/app.types'

/** The schema's OAuth field (which provider/connection the app authenticates with). */
export function getOAuthField(schema: ConfigSchema): Field | undefined {
  return schema.find((field) => field.type === 'oauth')
}

/** The connectionId currently stored under the app's OAuth field, if any. */
export function getConnectionId(
  app: EdgeApp,
  config: AppInstanceConfig,
): string | undefined {
  const field = getOAuthField(app.configSchema)
  if (!field) return undefined
  const value = config[field.key]
  return typeof value === 'string' && value ? value : undefined
}

/**
 * A `connected` app instance still needs an account: it's `connected` but has no
 * connectionId yet. The config page shows the centered connect prompt in this
 * state instead of the form.
 */
export function needsConnection(
  app: EdgeApp,
  config: AppInstanceConfig,
): boolean {
  return app.dataSource === 'connected' && !getConnectionId(app, config)
}

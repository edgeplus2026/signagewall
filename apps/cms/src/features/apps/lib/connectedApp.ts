import { isFieldVisible, type ConfigSchema, type Field } from '@signagewall/apps-contract'

import type { AppInstanceConfig, CatalogApp } from '@/features/apps/types/app.types'

/** The schema's OAuth field (which provider/connection the app authenticates with). */
export function getOAuthField(schema: ConfigSchema): Field | undefined {
  return schema.find((field) => field.type === 'oauth')
}

/**
 * The provider the app's OAuth field authenticates with, for the current config
 * values: `providerFrom` resolves it from a sibling field (e.g. a `source`
 * select mapping gsheets → google, excel → microsoft), else the static
 * `provider`. Undefined when neither yields one — e.g. the source is `manual`.
 */
export function resolveOAuthProvider(
  field: Field,
  config: AppInstanceConfig,
): string | undefined {
  if (field.providerFrom) {
    const value = config[field.providerFrom.field]
    return typeof value === 'string' ? field.providerFrom.map[value] : undefined
  }
  return field.provider
}

/** The connectionId currently stored under the app's OAuth field, if any. */
export function getConnectionId(
  app: CatalogApp,
  config: AppInstanceConfig,
): string | undefined {
  const field = getOAuthField(app.configSchema)
  if (!field) return undefined
  const value = config[field.key]
  return typeof value === 'string' && value ? value : undefined
}

/**
 * A `connected` app instance still needs an account before the form is usable:
 * it's `connected`, has no connectionId, and its OAuth field is REQUIRED and
 * currently visible. Apps where auth is optional (the menu board's manual
 * source) render the normal form and offer connecting inline instead — hiding
 * the whole form behind a connect prompt would block the mode that needs no
 * account at all.
 */
export function needsConnection(
  app: CatalogApp,
  config: AppInstanceConfig,
): boolean {
  if (app.dataSource !== 'connected' || getConnectionId(app, config)) {
    return false
  }
  const field = getOAuthField(app.configSchema)
  if (!field) return false
  return field.required === true && isFieldVisible(field.visibleWhen, config)
}

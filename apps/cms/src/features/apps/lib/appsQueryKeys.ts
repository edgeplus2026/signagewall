export const APPS_QUERY_ROOT = 'apps' as const

export function appsQueryKey(organizationId: string | null | undefined) {
  return [APPS_QUERY_ROOT, organizationId ?? 'none'] as const
}

export function appCatalogQueryKey(organizationId: string | null | undefined) {
  return [...appsQueryKey(organizationId), 'catalog'] as const
}

export function appDetailQueryKey(
  organizationId: string | null | undefined,
  id: string,
) {
  return [...appsQueryKey(organizationId), 'detail', id] as const
}

export function appInstancesQueryKey(
  organizationId: string | null | undefined,
  appId?: string,
) {
  return [...appsQueryKey(organizationId), 'instances', appId ?? 'all'] as const
}

/**
 * Prefix matching every instances list (per-app and the org-wide "all" list).
 * Used for invalidation so both refresh regardless of which appId they're keyed on.
 */
export function appInstancesRootQueryKey(
  organizationId: string | null | undefined,
) {
  return [...appsQueryKey(organizationId), 'instances'] as const
}

export function appInstanceDetailQueryKey(
  organizationId: string | null | undefined,
  instanceId: string,
) {
  return [...appsQueryKey(organizationId), 'instance', instanceId] as const
}

/** Super-admin catalog (org-independent). */
export const ADMIN_APPS_QUERY_KEY = ['admin', 'apps'] as const

/** Super-admin app categories (org-independent). */
export const ADMIN_CATEGORIES_QUERY_KEY = ['admin', 'app-categories'] as const

/** Org-facing app categories (read-only, for the catalog filter). */
export const APP_CATEGORIES_QUERY_KEY = [APPS_QUERY_ROOT, 'categories'] as const

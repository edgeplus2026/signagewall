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

export function appInstanceDetailQueryKey(
  organizationId: string | null | undefined,
  instanceId: string,
) {
  return [...appsQueryKey(organizationId), 'instance', instanceId] as const
}

/** Super-admin catalog (org-independent). */
export const ADMIN_APPS_QUERY_KEY = ['admin', 'apps'] as const

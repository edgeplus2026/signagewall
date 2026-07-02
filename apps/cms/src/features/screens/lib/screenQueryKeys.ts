export const SCREENS_QUERY_ROOT = "screens" as const

export function screensQueryKey(organizationId: string | null | undefined) {
  return [SCREENS_QUERY_ROOT, organizationId ?? "none"] as const
}

export function screenDetailQueryKey(
  organizationId: string | null | undefined,
  id: string,
) {
  return [...screensQueryKey(organizationId), "detail", id] as const
}

export function screenAvailabilityQueryKey(
  organizationId: string | null | undefined,
  id: string,
) {
  return [...screensQueryKey(organizationId), "availability", id] as const
}

export function screenDeviceQueryKey(
  organizationId: string | null | undefined,
  id: string,
) {
  return [...screensQueryKey(organizationId), "device", id] as const
}

export function screenStatusQueryKey(
  organizationId: string | null | undefined,
  id: string,
) {
  return [...screensQueryKey(organizationId), "status", id] as const
}

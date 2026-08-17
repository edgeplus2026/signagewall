export const ONBOARDING_QUERY_ROOT = 'onboarding' as const

/**
 * Scoped by organization: progress is measured against one organization's
 * content, so switching organizations must not show the previous one's answer.
 */
export function onboardingQueryKey(organizationId: string | null | undefined) {
  return [ONBOARDING_QUERY_ROOT, organizationId ?? 'none'] as const
}

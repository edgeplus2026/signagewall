import * as Sentry from "@sentry/react"

import { useAuthStore } from "@/features/auth/store/authStore"
import { useOrganizationStore } from "@/features/organizations/store/organizationStore"

const dsn = import.meta.env.VITE_SENTRY_DSN

/**
 * Sentry is disabled for local development (Vite sets `PROD` only for built
 * bundles) and whenever no DSN is configured, so dev sessions and DSN-less
 * environments never emit events.
 */
export const isSentryEnabled = Boolean(dsn) && import.meta.env.PROD

/**
 * Initializes Sentry error reporting and keeps the active user / organization
 * attached to every event. Errors-only: no performance tracing or session
 * replay. Safe to call unconditionally — it no-ops when disabled.
 */
export function initSentry(): void {
  if (!isSentryEnabled) {
    return
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,
    // Errors only — no tracing or replay.
    tracesSampleRate: 0,
  })

  // Prime the scope, then keep it in sync as the user logs in/out or switches
  // organizations.
  syncSentryContext()
  useAuthStore.subscribe(syncSentryContext)
  useOrganizationStore.subscribe(syncSentryContext)
}

/** Mirrors the current auth + organization state onto the Sentry scope. */
function syncSentryContext(): void {
  const { user, impersonationActive } = useAuthStore.getState()

  if (!user) {
    Sentry.setUser(null)
    Sentry.setTags({
      organization_id: undefined,
      organization_name: undefined,
      is_super_admin: undefined,
      impersonation_active: undefined,
    })
    return
  }

  const { activeOrganizationId, organizations } =
    useOrganizationStore.getState()
  const activeOrganization = organizations.find(
    (organization) => organization.id === activeOrganizationId,
  )

  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
  })

  Sentry.setTags({
    organization_id: activeOrganizationId ?? undefined,
    organization_name: activeOrganization?.name ?? undefined,
    organization_role: activeOrganization?.role ?? undefined,
    is_super_admin: user.isSuperAdmin,
    impersonation_active: impersonationActive,
  })
}

/**
 * Reports a React render error caught by the app's error boundary, attaching
 * the component stack. No-ops when Sentry is disabled.
 */
export function captureReactError(
  error: unknown,
  componentStack?: string | null,
): void {
  Sentry.withScope((scope) => {
    if (componentStack) {
      scope.setContext("react", { componentStack })
    }
    Sentry.captureException(error)
  })
}

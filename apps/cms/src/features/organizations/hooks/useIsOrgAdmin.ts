import { useActiveOrganization } from '@/features/organizations/store/organizationStore'

export function useIsOrgAdmin(): boolean {
  const activeOrganization = useActiveOrganization()
  return activeOrganization?.role === 'admin'
}

/**
 * The read-only `viewer` role. The server is the enforcement point
 * (`OrgMembershipGuard` refuses any write from a viewer), so this is purely
 * about not offering buttons that are guaranteed to 403 — a viewer who can
 * open a full editor, make changes and only then be refused has been misled.
 */
export function useIsOrgViewer(): boolean {
  const activeOrganization = useActiveOrganization()
  return activeOrganization?.role === 'viewer'
}

/**
 * Inverse of {@link useIsOrgViewer}: may this member change anything in the
 * active organization? Prefer this at call sites — it reads as intent and
 * stays correct if more read-only roles are added.
 */
export function useCanEditOrgContent(): boolean {
  return !useIsOrgViewer()
}

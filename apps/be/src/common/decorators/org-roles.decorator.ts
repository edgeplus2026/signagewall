import { SetMetadata } from '@nestjs/common';

import { OrganizationRole } from '../../modules/organizations/schemas/organization-membership.schema';

export const ORG_ROLES_KEY = 'orgRoles';

export interface OrgRolesMetadata {
  /**
   * Required organization role(s). `ADMIN` also accepts the legacy `OWNER`
   * role (both normalize to ADMIN). Omit/empty to require membership only.
   */
  roles?: OrganizationRole[];
  /**
   * Route param holding the organization id (e.g. `id` for `PATCH /:id`).
   * When omitted, the org id is read from the `x-organization-id` header.
   */
  idParam?: string;
  /**
   * Marks the route as write-intent even though its HTTP method is safe.
   * The viewer check treats GET/HEAD/OPTIONS as read-only by default; a GET
   * that mutates (e.g. starting an OAuth flow that rebinds a connection) must
   * set this or a read-only viewer would pass straight through it.
   */
  write?: boolean;
}

/**
 * Declares the organization-level authorization for a route. Pair with
 * {@link OrgMembershipGuard}, which loads the caller's membership, enforces
 * the required role, and exposes it via `@CurrentMembership()`.
 *
 * @example
 *   @RequireOrgRole({ roles: [OrganizationRole.ADMIN] })   // header-scoped
 *   @RequireOrgRole({ roles: [OrganizationRole.ADMIN], idParam: 'id' })
 */
export const RequireOrgRole = (metadata: OrgRolesMetadata = {}) =>
  SetMetadata(ORG_ROLES_KEY, metadata);

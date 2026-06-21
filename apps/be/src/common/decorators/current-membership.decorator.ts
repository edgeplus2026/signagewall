import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { CURRENT_MEMBERSHIP_KEY } from '../guards/org-membership.guard';
import type { OrganizationMembershipDocument } from '../../modules/organizations/schemas/organization-membership.schema';

/**
 * Injects the organization membership resolved by {@link OrgMembershipGuard}.
 * Only valid on routes decorated with `@RequireOrgRole(...)` and guarded by
 * `OrgMembershipGuard`; otherwise it resolves to `undefined`.
 */
export const CurrentMembership = createParamDecorator(
  (
    _data: unknown,
    context: ExecutionContext,
  ): OrganizationMembershipDocument | undefined => {
    const request = context.switchToHttp().getRequest<{
      [CURRENT_MEMBERSHIP_KEY]?: OrganizationMembershipDocument;
    }>();
    return request[CURRENT_MEMBERSHIP_KEY];
  },
);

import { ExecutionContext } from '@nestjs/common';

import { OrganizationRole } from '../../modules/organizations/schemas/organization-membership.schema';
import { BusinessException } from '../exceptions/business.exception';
import { OrgRolesMetadata } from '../decorators/org-roles.decorator';
import {
  CURRENT_MEMBERSHIP_KEY,
  OrgMembershipGuard,
} from './org-membership.guard';

/**
 * The viewer contract: a read-only member passes membership-only routes for
 * reads, is refused every mutation, and never satisfies an admin requirement.
 * Enforcement is central in the guard, so these tests are the regression net
 * for the whole content surface at once.
 */

const ORG_ID = '6a0000000000000000000001';

interface Setup {
  metadata?: OrgRolesMetadata;
  role?: OrganizationRole;
  method?: string;
  membershipExists?: boolean;
}

function build(setup: Setup = {}) {
  const request = {
    user: { id: 'user-1', email: 'u@example.com', name: 'U' },
    method: setup.method ?? 'GET',
    params: {},
    headers: { 'x-organization-id': ORG_ID },
  } as Record<string, unknown>;

  const context = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;

  const reflector = {
    getAllAndOverride: jest.fn(() => setup.metadata ?? {}),
  };
  const membership =
    setup.membershipExists === false
      ? null
      : { role: setup.role ?? OrganizationRole.MEMBER };
  const organizationsRepository = {
    findMembership: jest.fn().mockResolvedValue(membership),
    findById: jest.fn().mockResolvedValue({ _id: ORG_ID }),
  };

  const guard = new OrgMembershipGuard(
    reflector as never,
    organizationsRepository as never,
    { t: (key: string) => key } as never,
  );

  return { guard, context, request };
}

describe('OrgMembershipGuard — viewer read-only enforcement', () => {
  it('admits a viewer to a read', async () => {
    const { guard, context, request } = build({
      role: OrganizationRole.VIEWER,
      method: 'GET',
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request[CURRENT_MEMBERSHIP_KEY]).toBeDefined();
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    'refuses a viewer a %s on a membership-only route',
    async (method) => {
      const { guard, context } = build({
        role: OrganizationRole.VIEWER,
        method,
      });

      await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
        BusinessException,
      );
    },
  );

  it('still admits a member to a write', async () => {
    const { guard, context } = build({
      role: OrganizationRole.MEMBER,
      method: 'POST',
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  // `GET /connections/oauth/:provider/start` mutates: completing the flow it
  // begins rebinds the instance's connection. Method alone would admit a viewer.
  it('refuses a viewer a GET that declares write intent', async () => {
    const { guard, context } = build({
      role: OrganizationRole.VIEWER,
      method: 'GET',
      metadata: { write: true },
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      BusinessException,
    );
  });

  it('still admits a member to a write-intent GET', async () => {
    const { guard, context } = build({
      role: OrganizationRole.MEMBER,
      method: 'GET',
      metadata: { write: true },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('never lets a viewer satisfy an admin-only route, even for GET', async () => {
    const { guard, context } = build({
      role: OrganizationRole.VIEWER,
      method: 'GET',
      metadata: { roles: [OrganizationRole.ADMIN] },
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      BusinessException,
    );
  });

  it('normalizes the legacy OWNER role to admin (writes + admin routes pass)', async () => {
    const { guard, context } = build({
      role: OrganizationRole.OWNER,
      method: 'DELETE',
      metadata: { roles: [OrganizationRole.ADMIN] },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('refuses a non-member outright', async () => {
    const { guard, context } = build({ membershipExists: false });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      BusinessException,
    );
  });
});

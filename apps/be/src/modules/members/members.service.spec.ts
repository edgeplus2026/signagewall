import { Types } from 'mongoose';

import { BusinessException } from '../../common/exceptions/business.exception';
import { OrganizationRole } from '../organizations/schemas/organization-membership.schema';
import { MembersService } from './members.service';

/**
 * The last-admin invariant. An organization with no admin is unrecoverable
 * through the product — nobody can invite, promote, or change billing, and the
 * only fix is a database edit. This branch added the `viewer` role, which
 * widened the ways an admin can be demoted, so the invariant needs a spec that
 * covers EVERY lesser role rather than just `member`.
 */

const ORG_ID = new Types.ObjectId().toString();

interface Setup {
  role?: OrganizationRole;
  adminCount?: number;
}

function build(setup: Setup = {}) {
  const membershipId = new Types.ObjectId();
  const membership = {
    _id: membershipId,
    organizationId: { toString: () => ORG_ID },
    userId: new Types.ObjectId(),
    role: setup.role ?? OrganizationRole.ADMIN,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
  };

  const organizationsRepository = {
    findMembershipById: jest.fn().mockResolvedValue(membership),
    countAdminsByOrganizationId: jest
      .fn()
      .mockResolvedValue(setup.adminCount ?? 1),
    updateMembershipRole: jest.fn().mockResolvedValue(membership),
    deleteMembershipById: jest.fn().mockResolvedValue(true),
    findMembership: jest.fn().mockResolvedValue(membership),
    transferOwnershipFrom: jest.fn().mockResolvedValue(undefined),
  };

  const membersRepository = {
    findPendingById: jest.fn().mockResolvedValue(null),
    updateInvitation: jest.fn().mockResolvedValue(null),
    deleteInvitation: jest.fn().mockResolvedValue(true),
  };

  const usersRepository = {
    findById: jest.fn().mockResolvedValue({
      _id: membership.userId,
      name: 'Member',
      email: 'member@example.com',
    }),
    findManyByIds: jest.fn().mockResolvedValue([]),
  };

  const service = new MembersService(
    membersRepository as never,
    organizationsRepository as never,
    usersRepository as never,
    { send: jest.fn(), isEnabled: () => false } as never,
    {
      get: jest.fn(),
      getOrThrow: jest.fn(() => 'https://cms.example.com'),
    } as never,
    { run: async (fn: () => unknown) => fn() } as never,
    { t: (key: string) => key } as never,
  );

  return { service, organizationsRepository, membershipId };
}

describe('MembersService — last-admin invariant', () => {
  /**
   * The `viewer` role is the reason this is parameterised: a demotion check
   * written as `dto.role === MEMBER` would have let an admin become a viewer
   * and strand the org.
   */
  it.each([OrganizationRole.MEMBER, OrganizationRole.VIEWER] as const)(
    'refuses to demote the only admin to %s',
    async (role) => {
      const { service, organizationsRepository, membershipId } = build({
        role: OrganizationRole.ADMIN,
        adminCount: 1,
      });

      await expect(
        service.update('actor', ORG_ID, membershipId.toString(), { role }),
      ).rejects.toMatchObject({ message: 'members.cannotRemoveLastAdmin' });

      expect(
        organizationsRepository.updateMembershipRole,
      ).not.toHaveBeenCalled();
    },
  );

  it.each([OrganizationRole.MEMBER, OrganizationRole.VIEWER] as const)(
    'allows demoting an admin to %s when another admin remains',
    async (role) => {
      const { service, organizationsRepository, membershipId } = build({
        role: OrganizationRole.ADMIN,
        adminCount: 2,
      });

      await service.update('actor', ORG_ID, membershipId.toString(), { role });

      expect(organizationsRepository.updateMembershipRole).toHaveBeenCalledWith(
        membershipId.toString(),
        role,
      );
    },
  );

  it('refuses to remove the only admin', async () => {
    const { service, organizationsRepository, membershipId } = build({
      role: OrganizationRole.ADMIN,
      adminCount: 1,
    });

    await expect(
      service.remove('actor', ORG_ID, membershipId.toString()),
    ).rejects.toMatchObject({ message: 'members.cannotRemoveLastAdmin' });

    expect(organizationsRepository.deleteMembershipById).not.toHaveBeenCalled();
  });

  it('allows removing an admin when another admin remains', async () => {
    const { service, organizationsRepository, membershipId } = build({
      role: OrganizationRole.ADMIN,
      adminCount: 2,
    });

    await service.remove('actor', ORG_ID, membershipId.toString());

    expect(organizationsRepository.deleteMembershipById).toHaveBeenCalledWith(
      membershipId.toString(),
    );
  });

  it('never counts admins when removing a non-admin', async () => {
    const { service, organizationsRepository, membershipId } = build({
      role: OrganizationRole.VIEWER,
      adminCount: 1,
    });

    await service.remove('actor', ORG_ID, membershipId.toString());

    expect(
      organizationsRepository.countAdminsByOrganizationId,
    ).not.toHaveBeenCalled();
    expect(organizationsRepository.deleteMembershipById).toHaveBeenCalled();
  });

  /** Re-setting an admin to admin is a no-op, not a demotion. */
  it('does not block a no-op role write on the only admin', async () => {
    const { service, organizationsRepository, membershipId } = build({
      role: OrganizationRole.ADMIN,
      adminCount: 1,
    });

    await service.update('actor', ORG_ID, membershipId.toString(), {
      role: OrganizationRole.ADMIN,
    });

    expect(organizationsRepository.updateMembershipRole).toHaveBeenCalled();
  });

  it('surfaces the invariant as a BusinessException, not a raw error', async () => {
    const { service, membershipId } = build({
      role: OrganizationRole.ADMIN,
      adminCount: 1,
    });

    await expect(
      service.remove('actor', ORG_ID, membershipId.toString()),
    ).rejects.toBeInstanceOf(BusinessException);
  });
});

import { Types } from 'mongoose';

import { BusinessException } from '../../common/exceptions/business.exception';
import { UserPlan, UserRole } from '../users/schemas/user.schema';
import { PlansService } from './plans.service';

/** Mongoose query stub: `.exec()` resolves to `result`. */
const query = (result: unknown) => ({
  exec: jest.fn().mockResolvedValue(result),
});

/** Query stub that supports the `.select(...).exec()` chain. */
const selectQuery = (result: unknown) => ({
  select: jest.fn(() => query(result)),
});

/** Query stub for `.sort(...).select(...).exec()`. */
const sortSelectQuery = (result: unknown) => ({
  sort: jest.fn(() => selectQuery(result)),
});

const OWNER_ID = new Types.ObjectId();
const MEMBER_ID = new Types.ObjectId();
const ORG_ID = new Types.ObjectId();

interface UserStub {
  _id: Types.ObjectId;
  plan?: UserPlan;
  screenLimit?: number;
  role?: UserRole;
  trialEndsAt?: Date | null;
  name?: string;
  email?: string;
}

const user = (overrides: Partial<UserStub> = {}): UserStub => ({
  _id: OWNER_ID,
  plan: UserPlan.FREE,
  screenLimit: 1,
  role: UserRole.USER,
  trialEndsAt: new Date('2026-09-01'),
  name: 'Test',
  email: 'test@example.com',
  ...overrides,
});

interface Deps {
  /** Users by id, for owner + sponsor lookups. */
  users?: Record<string, UserStub>;
  /** Organizations this user owns. */
  ownedOrganizations?: { _id: Types.ObjectId }[];
  /** Organizations the user belongs to but does not own (sponsor lookup). */
  foreignOrganizations?: { ownerUserId?: Types.ObjectId }[];
  /** Memberships the user has at all. */
  memberships?: { organizationId: Types.ObjectId }[];
  screenCount?: number;
  /** `ownerUserId` returned by findById(orgId).select('ownerUserId'). */
  organizationOwner?: Types.ObjectId | null;
}

function build(deps: Deps) {
  const owned = deps.ownedOrganizations ?? [];
  const foreign = deps.foreignOrganizations ?? [];

  const organizationModel = {
    find: jest.fn((filter: Record<string, unknown>) =>
      // The owned-orgs lookup filters on ownerUserId; the sponsor lookup filters
      // on `_id: { $in: ... }`. Distinguished by which key is present.
      selectQuery('_id' in filter ? foreign : owned),
    ),
    findById: jest.fn(() =>
      selectQuery(
        deps.organizationOwner === undefined
          ? { ownerUserId: OWNER_ID }
          : deps.organizationOwner === null
            ? null
            : { ownerUserId: deps.organizationOwner },
      ),
    ),
  };

  const membershipModel = {
    find: jest.fn(() => selectQuery(deps.memberships ?? [])),
    findOne: jest.fn(() => sortSelectQuery(null)),
  };

  const screenModel = {
    countDocuments: jest.fn(() => query(deps.screenCount ?? 0)),
  };

  const usersRepository = {
    findById: jest.fn((id: string) =>
      Promise.resolve(deps.users?.[id] ?? user()),
    ),
  };

  const service = new PlansService(
    organizationModel as never,
    membershipModel as never,
    screenModel as never,
    { findOpenRequestForUser: jest.fn().mockResolvedValue(null) } as never,
    usersRepository as never,
    { sendUpgradeRequestEmail: jest.fn() } as never,
    { t: (key: string) => key } as never,
    { record: jest.fn().mockResolvedValue(undefined) } as never,
  );

  return { service, organizationModel, membershipModel, usersRepository };
}

describe('PlansService.assertCanCreateScreen', () => {
  it('allows a free account its first screen', async () => {
    const { service } = build({
      users: { [OWNER_ID.toString()]: user() },
      ownedOrganizations: [{ _id: ORG_ID }],
      screenCount: 0,
    });

    await expect(
      service.assertCanCreateScreen(ORG_ID.toString()),
    ).resolves.toBeUndefined();
  });

  it('refuses a free account a second screen', async () => {
    const { service } = build({
      users: { [OWNER_ID.toString()]: user() },
      ownedOrganizations: [{ _id: ORG_ID }],
      screenCount: 1,
    });

    await expect(
      service.assertCanCreateScreen(ORG_ID.toString()),
    ).rejects.toBeInstanceOf(BusinessException);
  });

  it('counts screens across every organization the owner has', async () => {
    const secondOrg = new Types.ObjectId();
    const { service, organizationModel } = build({
      users: {
        [OWNER_ID.toString()]: user({
          plan: UserPlan.ENTERPRISE,
          screenLimit: 3,
        }),
      },
      ownedOrganizations: [{ _id: ORG_ID }, { _id: secondOrg }],
      screenCount: 3,
    });

    // Three licences, three screens already spread over two organizations.
    await expect(
      service.assertCanCreateScreen(ORG_ID.toString()),
    ).rejects.toBeInstanceOf(BusinessException);
    expect(organizationModel.find).toHaveBeenCalled();
  });

  it('reports the plan and usage in the error details so the CMS can prompt', async () => {
    const { service } = build({
      users: { [OWNER_ID.toString()]: user() },
      ownedOrganizations: [{ _id: ORG_ID }],
      screenCount: 1,
    });

    await expect(
      service.assertCanCreateScreen(ORG_ID.toString()),
    ).rejects.toMatchObject({
      details: {
        reason: 'PLAN_LIMIT_REACHED',
        limitOf: 'screens',
        plan: UserPlan.FREE,
        limit: 1,
        used: 1,
      },
    });
  });

  it('spends the owner’s licences when a member creates the screen', async () => {
    const { service } = build({
      users: {
        // The org resolves to its owner, who is enterprise with room to spare —
        // the acting member's own free plan must not be what gets checked.
        [OWNER_ID.toString()]: user({
          plan: UserPlan.ENTERPRISE,
          screenLimit: 5,
        }),
      },
      ownedOrganizations: [{ _id: ORG_ID }],
      screenCount: 2,
    });

    await expect(
      service.assertCanCreateScreen(ORG_ID.toString()),
    ).resolves.toBeUndefined();
  });

  it('fails open when no owner can be resolved', async () => {
    const { service } = build({
      organizationOwner: null,
      ownedOrganizations: [],
    });

    await expect(
      service.assertCanCreateScreen(ORG_ID.toString()),
    ).resolves.toBeUndefined();
  });

  it('fails open rather than 404s when the owner row is gone', async () => {
    // Ownership normally moves on when an owner leaves; this is the backstop
    // for data where it did not. Refusing every screen would break a team that
    // did nothing wrong.
    const { service, usersRepository } = build({ ownedOrganizations: [] });
    usersRepository.findById.mockResolvedValue(null);

    await expect(
      service.assertCanCreateScreen(ORG_ID.toString()),
    ).resolves.toBeUndefined();
  });
});

describe('PlansService.assertCanCreateOrganization', () => {
  it('allows a free account its first organization', async () => {
    const { service } = build({
      users: { [OWNER_ID.toString()]: user() },
      ownedOrganizations: [],
    });

    await expect(
      service.assertCanCreateOrganization(OWNER_ID.toString()),
    ).resolves.toBeUndefined();
  });

  it('refuses a free account a second organization', async () => {
    const { service } = build({
      users: { [OWNER_ID.toString()]: user() },
      ownedOrganizations: [{ _id: ORG_ID }],
    });

    await expect(
      service.assertCanCreateOrganization(OWNER_ID.toString()),
    ).rejects.toMatchObject({
      details: { limitOf: 'organizations' },
    });
  });

  it('does not cap enterprise accounts', async () => {
    const { service } = build({
      users: {
        [OWNER_ID.toString()]: user({
          plan: UserPlan.ENTERPRISE,
          screenLimit: 10,
        }),
      },
      ownedOrganizations: [{ _id: ORG_ID }, { _id: new Types.ObjectId() }],
    });

    await expect(
      service.assertCanCreateOrganization(OWNER_ID.toString()),
    ).resolves.toBeUndefined();
  });
});

describe('PlansService.resolveForUser', () => {
  it('treats a member of somebody else’s enterprise org as sponsored', async () => {
    const { service } = build({
      users: {
        [MEMBER_ID.toString()]: user({ _id: MEMBER_ID }),
        [OWNER_ID.toString()]: user({
          plan: UserPlan.ENTERPRISE,
          screenLimit: 4,
        }),
      },
      memberships: [{ organizationId: ORG_ID }],
      foreignOrganizations: [{ ownerUserId: OWNER_ID }],
      ownedOrganizations: [],
    });

    const entitlement = await service.resolveForUser(
      user({ _id: MEMBER_ID }) as never,
    );

    expect(entitlement.isSponsored).toBe(true);
    expect(entitlement.plan).toBe(UserPlan.ENTERPRISE);
    // Sponsored accounts must never be swept: no trial deadline is reported.
    expect(entitlement.trialEndsAt).toBeNull();
  });

  it('leaves a free account with no enterprise ties unsponsored', async () => {
    const { service } = build({
      users: { [MEMBER_ID.toString()]: user({ _id: MEMBER_ID }) },
      memberships: [{ organizationId: ORG_ID }],
      foreignOrganizations: [{ ownerUserId: MEMBER_ID }],
      ownedOrganizations: [],
    });

    const entitlement = await service.resolveForUser(
      user({ _id: MEMBER_ID }) as never,
    );

    expect(entitlement.isSponsored).toBe(false);
    expect(entitlement.plan).toBe(UserPlan.FREE);
    expect(entitlement.trialEndsAt).not.toBeNull();
  });

  it('gives super-admins unlimited everything and no trial', async () => {
    const admin = user({ role: UserRole.SUPER_ADMIN });
    const { service } = build({
      users: { [OWNER_ID.toString()]: admin },
      ownedOrganizations: [],
    });

    const entitlement = await service.resolveForUser(admin as never);

    expect(entitlement.isSuperAdmin).toBe(true);
    expect(entitlement.screenLimit).toBeNull();
    expect(entitlement.organizationLimit).toBeNull();
    expect(entitlement.trialEndsAt).toBeNull();
  });
});

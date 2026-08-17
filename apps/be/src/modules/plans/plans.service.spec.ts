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

/** Query stub for `.sort(...).limit(...).select(...).exec()`. */
const sortLimitSelectQuery = (result: unknown) => ({
  sort: jest.fn(() => ({ limit: jest.fn(() => selectQuery(result)) })),
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
  /** Screens returned by the post-insert survivor query, oldest first. */
  survivingScreens?: { _id: Types.ObjectId }[];
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
    find: jest.fn(() => sortLimitSelectQuery(deps.survivingScreens ?? [])),
    deleteOne: jest.fn(() => query({ deletedCount: 1 })),
  };

  const usersRepository = {
    // `UserStub | null`, because the missing-owner case is one of the behaviours
    // under test: a row that has gone away must fail open, not 404.
    findById: jest.fn(
      (id: string): Promise<UserStub | null> =>
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

  return {
    service,
    organizationModel,
    membershipModel,
    screenModel,
    usersRepository,
  };
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

  it('fails closed when no owner can be resolved', async () => {
    // An ownerless organization has no licences to spend; failing open would
    // let the remaining members grow an uncounted fleet.
    const { service } = build({
      organizationOwner: null,
      ownedOrganizations: [],
    });

    await expect(
      service.assertCanCreateScreen(ORG_ID.toString()),
    ).rejects.toBeInstanceOf(BusinessException);
  });

  it('fails closed when the owner row is gone', async () => {
    const { service, usersRepository } = build({ ownedOrganizations: [] });
    usersRepository.findById.mockResolvedValue(null);

    await expect(
      service.assertCanCreateScreen(ORG_ID.toString()),
    ).rejects.toBeInstanceOf(BusinessException);
  });
});

describe('PlansService.assertCreatedScreenWithinLimit', () => {
  const SCREEN_ID = new Types.ObjectId();

  it('keeps the screen when the owner is within the limit', async () => {
    const { service, screenModel } = build({
      users: { [OWNER_ID.toString()]: user({ screenLimit: 2 }) },
      ownedOrganizations: [{ _id: ORG_ID }],
      screenCount: 2,
    });

    await expect(
      service.assertCreatedScreenWithinLimit(
        ORG_ID.toString(),
        SCREEN_ID.toString(),
      ),
    ).resolves.toBeUndefined();
    expect(screenModel.deleteOne).not.toHaveBeenCalled();
  });

  it('keeps the screen when over the limit but it is among the oldest', async () => {
    // Two racers passed the pre-check; the older insert survives.
    const { service, screenModel } = build({
      users: { [OWNER_ID.toString()]: user({ screenLimit: 1 }) },
      ownedOrganizations: [{ _id: ORG_ID }],
      screenCount: 2,
      survivingScreens: [{ _id: SCREEN_ID }],
    });

    await expect(
      service.assertCreatedScreenWithinLimit(
        ORG_ID.toString(),
        SCREEN_ID.toString(),
      ),
    ).resolves.toBeUndefined();
    expect(screenModel.deleteOne).not.toHaveBeenCalled();
  });

  it('rolls back and throws when the screen is the over-cap extra', async () => {
    const olderScreen = new Types.ObjectId();
    const { service, screenModel } = build({
      users: { [OWNER_ID.toString()]: user({ screenLimit: 1 }) },
      ownedOrganizations: [{ _id: ORG_ID }],
      screenCount: 2,
      survivingScreens: [{ _id: olderScreen }],
    });

    await expect(
      service.assertCreatedScreenWithinLimit(
        ORG_ID.toString(),
        SCREEN_ID.toString(),
      ),
    ).rejects.toMatchObject({
      details: { reason: 'PLAN_LIMIT_REACHED', limitOf: 'screens' },
    });
    expect(screenModel.deleteOne).toHaveBeenCalledWith({ _id: SCREEN_ID });
  });

  it('rolls back and throws when the owner vanished mid-create', async () => {
    const { service, screenModel } = build({
      organizationOwner: null,
      ownedOrganizations: [],
    });

    await expect(
      service.assertCreatedScreenWithinLimit(
        ORG_ID.toString(),
        SCREEN_ID.toString(),
      ),
    ).rejects.toBeInstanceOf(BusinessException);
    expect(screenModel.deleteOne).toHaveBeenCalledWith({ _id: SCREEN_ID });
  });

  it('rolls back a zero-licence owner without querying survivors', async () => {
    // `.limit(0)` would mean "no limit" to Mongo, so the zero-cap path must
    // not run the survivor query at all.
    const { service, screenModel } = build({
      users: { [OWNER_ID.toString()]: user({ screenLimit: 0 }) },
      ownedOrganizations: [{ _id: ORG_ID }],
      screenCount: 1,
    });

    await expect(
      service.assertCreatedScreenWithinLimit(
        ORG_ID.toString(),
        SCREEN_ID.toString(),
      ),
    ).rejects.toBeInstanceOf(BusinessException);
    expect(screenModel.find).not.toHaveBeenCalled();
    expect(screenModel.deleteOne).toHaveBeenCalledWith({ _id: SCREEN_ID });
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

import '../../load-env';

import { NestFactory } from '@nestjs/core';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';

import { AppModule } from '../../app.module';
import { UserPlan } from '../../modules/users/schemas/user.schema';

/**
 * One-off backfill for accounts that existed before plans.
 *
 * Two things need doing, both idempotent:
 *
 * 1. Every organization gets an `ownerUserId` (its earliest admin), because the
 *    licence cap resolves limits through the owner.
 * 2. Every pre-existing user is put on **enterprise** with a limit generous
 *    enough to cover what they already built. They never agreed to a 21-day
 *    clock, and starting one under them would delete real customers. Drop
 *    individual accounts to free from Super admin afterwards if they are not
 *    customers.
 *
 * Accounts created after this runs get the schema defaults — free, one screen,
 * 21 days — with no help from here.
 *
 *   pnpm --filter @signagewall/be migrate:plans          # dry run
 *   pnpm --filter @signagewall/be migrate:plans:apply
 */

/** Floor for a backfilled licence count, so an existing customer has headroom. */
const MIN_BACKFILLED_LIMIT = 3;

interface OrganizationRow {
  _id: Types.ObjectId;
  ownerUserId?: Types.ObjectId;
}

interface UserRow {
  _id: Types.ObjectId;
  email: string;
  plan?: string;
  screenLimit?: number;
}

async function run(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const connection = app.get<Connection>(getConnectionToken());
    const db = connection.db;

    if (!db) {
      throw new Error('No database connection');
    }

    const organizations = db.collection<OrganizationRow>('organizations');
    const memberships = db.collection('organizationmemberships');
    const screens = db.collection('screens');
    const users = db.collection<UserRow>('users');

    // --- 1. Organization owners ---------------------------------------------
    const orphanOrgs = await organizations
      .find({ ownerUserId: { $exists: false } })
      .toArray();

    let ownersSet = 0;
    let ownerless = 0;

    for (const organization of orphanOrgs) {
      const earliestAdmin = await memberships
        .find({
          organizationId: organization._id,
          role: { $in: ['admin', 'owner'] },
        })
        .sort({ createdAt: 1, _id: 1 })
        .limit(1)
        .toArray();

      const ownerId = earliestAdmin[0]?.userId as Types.ObjectId | undefined;

      if (!ownerId) {
        // No admin left — nothing to charge. Left alone rather than guessed at;
        // PlansService fails open for these.
        ownerless += 1;
        continue;
      }

      if (apply) {
        await organizations.updateOne(
          { _id: organization._id },
          { $set: { ownerUserId: ownerId } },
        );
      }
      ownersSet += 1;
    }

    // --- 2. Existing users onto enterprise -----------------------------------
    const legacyUsers = await users
      .find({ plan: { $exists: false } })
      .toArray();

    let upgraded = 0;

    for (const user of legacyUsers) {
      const ownedOrgIds = (
        await organizations
          .find({ ownerUserId: user._id })
          .project<{ _id: Types.ObjectId }>({ _id: 1 })
          .toArray()
      ).map((organization) => organization._id);

      // Post-apply the owners above are written; on a dry run they are not, so
      // this count reads low. That is fine — the floor covers it.
      const screenCount =
        ownedOrgIds.length > 0
          ? await screens.countDocuments({
              organizationId: { $in: ownedOrgIds },
            })
          : 0;

      const screenLimit = Math.max(MIN_BACKFILLED_LIMIT, screenCount);

      if (apply) {
        await users.updateOne(
          { _id: user._id },
          {
            $set: {
              plan: UserPlan.ENTERPRISE,
              screenLimit,
              trialEndsAt: null,
              trialWarningSentAt: null,
            },
          },
        );
      }

      console.log(
        `  ${user.email}: enterprise, ${screenLimit.toString()} screen(s)`,
      );
      upgraded += 1;
    }

    console.log(
      [
        '',
        apply ? 'Applied:' : 'Dry run (pass --apply to write):',
        `  organizations given an owner: ${ownersSet.toString()}`,
        `  organizations with no admin (skipped): ${ownerless.toString()}`,
        `  users moved to enterprise: ${upgraded.toString()}`,
        '',
      ].join('\n'),
    );
  } finally {
    await app.close();
  }
}

void run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

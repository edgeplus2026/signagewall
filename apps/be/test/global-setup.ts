import { MongoMemoryReplSet } from 'mongodb-memory-server';

/**
 * Boots one in-memory MongoDB for the whole e2e run, so the pack is
 * self-contained: no local mongod, no shared state with a dev database, and
 * nothing to clean up on a crashed run — the process owns the data dir.
 *
 * A single-node replica set rather than a standalone, because the backend
 * uses multi-document transactions (org creation, invite acceptance) and
 * Mongo only permits those against a replica set.
 *
 * The URI is handed to workers via `process.env`, which Jest snapshots into
 * each worker at spawn. `setup-env.ts` only fills MONGODB_URI when unset, so
 * this takes precedence over its localhost fallback.
 */
export default async function globalSetup(): Promise<void> {
  const mongod = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
  });
  process.env.MONGODB_URI = mongod.getUri('signagewall-e2e');
  (globalThis as { __MONGOD__?: MongoMemoryReplSet }).__MONGOD__ = mongod;
}

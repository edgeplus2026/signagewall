import type { MongoMemoryReplSet } from 'mongodb-memory-server';

export default async function globalTeardown(): Promise<void> {
  const mongod = (globalThis as { __MONGOD__?: MongoMemoryReplSet }).__MONGOD__;
  await mongod?.stop();
}

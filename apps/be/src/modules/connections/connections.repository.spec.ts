import { Types } from 'mongoose';

import { ConnectionsRepository } from './connections.repository';
import { ConnectionProvider } from './schemas/app-connection.schema';

describe('ConnectionsRepository.upsertByInstance ownership', () => {
  it('scopes reconnect by immutable organization and instance ownership', async () => {
    const findOneAndUpdate = jest.fn().mockResolvedValue({});
    const repository = new ConnectionsRepository({ findOneAndUpdate } as never);
    const organizationId = new Types.ObjectId().toString();
    const instanceId = new Types.ObjectId().toString();

    await repository.upsertByInstance({
      organizationId,
      instanceId,
      provider: ConnectionProvider.MICROSOFT,
      accountLabel: 'operator@example.com',
      scopes: ['Report.Read.All'],
      accessTokenEnc: 'encrypted-token',
    });

    const [filter, update, options] = findOneAndUpdate.mock.calls[0];
    expect(filter).toEqual({
      organizationId: new Types.ObjectId(organizationId),
      instanceId: new Types.ObjectId(instanceId),
    });
    expect(update.$set).not.toHaveProperty('organizationId');
    expect(update.$set).not.toHaveProperty('instanceId');
    expect(update.$setOnInsert).toEqual({
      organizationId: new Types.ObjectId(organizationId),
      instanceId: new Types.ObjectId(instanceId),
    });
    expect(update.$unset).toEqual({
      refreshTokenEnc: 1,
      expiresAt: 1,
      providerAccountId: 1,
    });
    expect(options).toMatchObject({ upsert: true });
  });

  it('replaces reconnect credentials without unsetting newly supplied values', async () => {
    const findOneAndUpdate = jest.fn().mockResolvedValue({});
    const repository = new ConnectionsRepository({ findOneAndUpdate } as never);

    await repository.upsertByInstance({
      organizationId: new Types.ObjectId().toString(),
      instanceId: new Types.ObjectId().toString(),
      provider: ConnectionProvider.MICROSOFT,
      accountLabel: 'new-account@example.com',
      scopes: ['Report.Read.All'],
      accessTokenEnc: 'new-access-token',
      refreshTokenEnc: 'new-refresh-token',
      expiresAt: new Date('2026-08-05T12:00:00.000Z'),
      providerAccountId: '61591354598487',
    });

    const [, update] = findOneAndUpdate.mock.calls[0];
    expect(update.$set).toMatchObject({
      refreshTokenEnc: 'new-refresh-token',
      expiresAt: new Date('2026-08-05T12:00:00.000Z'),
      providerAccountId: '61591354598487',
    });
    expect(update).not.toHaveProperty('$unset');
  });

  it('clears the previous account id when reconnecting to another account', async () => {
    const findOneAndUpdate = jest.fn().mockResolvedValue({});
    const repository = new ConnectionsRepository({ findOneAndUpdate } as never);

    // Meta's deauthorize/data-deletion callbacks find connections BY this id, so
    // an id left behind from the previously connected account would make the new
    // account's connection answer for someone else's erasure request.
    await repository.upsertByInstance({
      organizationId: new Types.ObjectId().toString(),
      instanceId: new Types.ObjectId().toString(),
      provider: ConnectionProvider.META,
      accountLabel: 'Someone Else',
      scopes: ['pages_show_list'],
      accessTokenEnc: 'new-access-token',
      refreshTokenEnc: 'new-refresh-token',
      expiresAt: new Date('2026-08-05T12:00:00.000Z'),
    });

    const [, update] = findOneAndUpdate.mock.calls[0];
    expect(update.$set).not.toHaveProperty('providerAccountId');
    expect(update.$unset).toEqual({ providerAccountId: 1 });
  });
});

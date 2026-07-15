import { Types } from 'mongoose';

import { BusinessException } from '../../common/exceptions/business.exception';
import { DataDeletionService } from './data-deletion.service';

/** Mongoose query stub: `.exec()` resolves to `result`. */
const query = (result: unknown) => ({
  exec: jest.fn().mockResolvedValue(result),
});

interface Deps {
  membershipFind: unknown[];
  memberCount?: number;
  adminCount?: number;
  org?: { _id: Types.ObjectId; name: string } | null;
}

function build(deps: Deps) {
  const pendingModel = { updateOne: jest.fn(() => query(undefined)) };
  const membershipModel = {
    find: jest.fn(() => query(deps.membershipFind)),
    countDocuments: jest
      .fn()
      .mockReturnValueOnce(query(deps.memberCount ?? 0))
      .mockReturnValueOnce(query(deps.adminCount ?? 0)),
    deleteOne: jest.fn(() => query(undefined)),
    deleteMany: jest.fn(() => query(undefined)),
  };
  const organizationModel = {
    findById: jest.fn(() => query(deps.org ?? null)),
    updateOne: jest.fn(() => query(undefined)),
  };
  const usersRepository = { deactivate: jest.fn(), anonymize: jest.fn() };
  const noop = { deleteMany: jest.fn(() => query(undefined)) };
  // screen model also serves requestOrgDeletion's "blank the screens" lookup.
  const screenModel = {
    deleteMany: jest.fn(() => query(undefined)),
    find: jest.fn(() => ({ select: jest.fn(() => query([])) })),
  };
  const eventEmitter = { emit: jest.fn() };

  const service = new DataDeletionService(
    pendingModel as never,
    organizationModel as never,
    membershipModel as never,
    noop as never, // invitation
    screenModel as never, // screen
    noop as never, // device
    noop as never, // playlist
    noop as never, // appInstance
    noop as never, // orgApp
    noop as never, // appConnection
    {} as never, // mediaService
    usersRepository as never,
    { deleteByUser: jest.fn() } as never, // legalRepository
    {} as never, // transactionService
    eventEmitter as never,
    { t: (key: string) => key } as never,
  );

  return {
    service,
    pendingModel,
    membershipModel,
    organizationModel,
    usersRepository,
    eventEmitter,
  };
}

describe('DataDeletionService.requestAccountDeletion', () => {
  const userId = new Types.ObjectId().toString();
  const orgId = new Types.ObjectId();

  it('blocks when the user is the sole admin of an org with other members', async () => {
    const { service, usersRepository } = build({
      membershipFind: [{ role: 'admin', organizationId: orgId }],
      memberCount: 3,
      adminCount: 1,
      org: { _id: orgId, name: 'Acme' },
    });

    await expect(service.requestAccountDeletion(userId)).rejects.toBeInstanceOf(
      BusinessException,
    );
    // Must not deactivate the account when blocked.
    expect(usersRepository.deactivate).not.toHaveBeenCalled();
  });

  it('does NOT block a sole member (org gets cascaded, not orphaned)', async () => {
    const { service, usersRepository, pendingModel } = build({
      membershipFind: [{ role: 'admin', organizationId: orgId }],
      memberCount: 1,
      adminCount: 1,
      org: { _id: orgId, name: 'Solo' },
    });

    const result = await service.requestAccountDeletion(userId);

    expect(result.scheduledFor).toBeDefined();
    expect(usersRepository.deactivate).toHaveBeenCalledWith(userId);
    expect(pendingModel.updateOne).toHaveBeenCalled();
  });

  it('does NOT block when another admin remains', async () => {
    const { service, usersRepository } = build({
      membershipFind: [{ role: 'admin', organizationId: orgId }],
      memberCount: 3,
      adminCount: 2,
      org: { _id: orgId, name: 'Acme' },
    });

    await expect(service.requestAccountDeletion(userId)).resolves.toBeDefined();
    expect(usersRepository.deactivate).toHaveBeenCalled();
  });
});

describe('DataDeletionService.requestOrgDeletion', () => {
  const userId = new Types.ObjectId().toString();
  const orgId = new Types.ObjectId();

  it('soft-deletes the org and queues a pending deletion ~30 days out', async () => {
    const { service, organizationModel, pendingModel } = build({
      membershipFind: [],
      org: { _id: orgId, name: 'Acme' },
    });

    const before = Date.now();
    const result = await service.requestOrgDeletion(orgId.toString(), userId);

    // deletedAt set on the org
    expect(organizationModel.updateOne).toHaveBeenCalledWith(
      { _id: orgId },
      { $set: { deletedAt: expect.any(Date) } },
    );
    expect(pendingModel.updateOne).toHaveBeenCalled();
    const days =
      (new Date(result.scheduledFor).getTime() - before) / 86_400_000;
    expect(days).toBeGreaterThan(29);
    expect(days).toBeLessThan(31);
  });
});

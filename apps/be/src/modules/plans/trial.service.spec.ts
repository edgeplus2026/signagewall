import { Types } from 'mongoose';

import { UserPlan } from '../users/schemas/user.schema';
import { TrialService } from './trial.service';

const query = (result: unknown) => ({
  exec: jest.fn().mockResolvedValue(result),
});

const USER_ID = new Types.ObjectId();

const expiredUser = {
  _id: USER_ID,
  name: 'Trial User',
  email: 'trial@example.com',
  plan: UserPlan.FREE,
  trialEndsAt: new Date('2026-08-01'),
};

interface Deps {
  /** Rows returned by the warning pass, then by the expiry pass. */
  toWarn?: unknown[];
  toExpire?: unknown[];
  sponsored?: boolean;
  mailThrows?: boolean;
}

function build(deps: Deps) {
  const userModel = {
    find: jest
      .fn()
      .mockReturnValueOnce(query(deps.toWarn ?? []))
      .mockReturnValueOnce(query(deps.toExpire ?? [])),
    updateOne: jest.fn(() => query({ modifiedCount: 1 })),
  };

  const plansService = {
    resolveForUser: jest.fn().mockResolvedValue({
      isSponsored: deps.sponsored ?? false,
      isSuperAdmin: false,
    }),
  };

  const mailService = {
    sendTrialExpiringEmail: deps.mailThrows
      ? jest.fn().mockRejectedValue(new Error('smtp down'))
      : jest.fn().mockResolvedValue(undefined),
  };

  const configService = {
    getOrThrow: jest.fn(() => 'https://app.example.com'),
  };

  const service = new TrialService(
    userModel as never,
    plansService as never,
    mailService as never,
    configService as never,
    // Always the leader in a test: there is one process and no Redis.
    { isLeader: jest.fn().mockResolvedValue(true) } as never,
  );

  return { service, userModel, mailService };
}

describe('TrialService.runTrialSweep', () => {
  it('marks an expired trial while retaining the account and its data', async () => {
    const { service, userModel } = build({
      toExpire: [expiredUser],
    });

    const result = await service.runTrialSweep();

    expect(userModel.updateOne).toHaveBeenCalledWith(
      { _id: USER_ID, trialExpiredAt: null },
      { $set: { trialExpiredAt: expect.any(Date) } },
    );
    expect(result.expired).toBe(1);
  });

  it('does not expire an account covered by a paying organization', async () => {
    const { service, userModel } = build({
      toExpire: [expiredUser],
      sponsored: true,
    });

    const result = await service.runTrialSweep();

    expect(userModel.updateOne).not.toHaveBeenCalled();
    expect(result.expired).toBe(0);
  });

  it('expires safely even when the warning email fails', async () => {
    const { service, userModel } = build({
      toWarn: [expiredUser],
      toExpire: [expiredUser],
      mailThrows: true,
    });

    const result = await service.runTrialSweep();

    expect(userModel.updateOne).toHaveBeenCalledTimes(1);
    expect(result.warned).toBe(0);
    expect(result.expired).toBe(1);
  });

  it('warns an account whose trial is nearly up and stamps it once', async () => {
    const { service, userModel, mailService } = build({
      toWarn: [expiredUser],
    });

    const result = await service.runTrialSweep();

    expect(mailService.sendTrialExpiringEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'trial@example.com' }),
    );
    expect(userModel.updateOne).toHaveBeenCalledWith(
      { _id: USER_ID },
      { $set: { trialWarningSentAt: expect.any(Date) } },
    );
    expect(result.warned).toBe(1);
  });

  it('leaves the warning unstamped when email fails so it retries', async () => {
    const { service, userModel } = build({
      toWarn: [expiredUser],
      mailThrows: true,
    });

    const result = await service.runTrialSweep();

    expect(userModel.updateOne).not.toHaveBeenCalled();
    expect(result.warned).toBe(0);
  });

  it('keeps processing after one expiry update fails', async () => {
    const second = { ...expiredUser, _id: new Types.ObjectId() };
    const { service, userModel } = build({
      toExpire: [expiredUser, second],
    });
    userModel.updateOne
      .mockReturnValueOnce({
        exec: jest.fn().mockRejectedValue(new Error('mongo timeout')),
      })
      .mockReturnValueOnce(query({ modifiedCount: 1 }));

    const result = await service.runTrialSweep();

    expect(userModel.updateOne).toHaveBeenCalledTimes(2);
    expect(result.expired).toBe(1);
  });
});

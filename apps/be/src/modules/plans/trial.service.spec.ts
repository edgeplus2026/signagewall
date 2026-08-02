import { Types } from 'mongoose';

import { UserPlan } from '../users/schemas/user.schema';
import { TrialService } from './trial.service';

const query = (result: unknown) => ({
  exec: jest.fn().mockResolvedValue(result),
});

const USER_ID = new Types.ObjectId();
const ORG_ID = new Types.ObjectId().toString();

const expiredUser = {
  _id: USER_ID,
  name: 'Trial User',
  email: 'trial@example.com',
  plan: UserPlan.FREE,
  trialEndsAt: new Date('2026-08-01'),
};

interface Deps {
  /** Rows returned by the warning pass, then by the deletion pass. */
  toWarn?: unknown[];
  toDelete?: unknown[];
  mailEnabled?: boolean;
  sponsored?: boolean;
  mailThrows?: boolean;
}

function build(deps: Deps) {
  const userModel = {
    find: jest
      .fn()
      .mockReturnValueOnce(query(deps.toWarn ?? []))
      .mockReturnValueOnce(query(deps.toDelete ?? [])),
    updateOne: jest.fn(() => query(undefined)),
  };

  const plansService = {
    resolveForUser: jest.fn().mockResolvedValue({
      isSponsored: deps.sponsored ?? false,
      isSuperAdmin: false,
      ownedOrganizationIds: [ORG_ID],
    }),
  };

  const dataDeletionService = {
    purgeTrialAccount: jest.fn().mockResolvedValue(undefined),
  };

  const mailService = {
    isEnabled: jest.fn().mockReturnValue(deps.mailEnabled ?? true),
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
    dataDeletionService as never,
    mailService as never,
    configService as never,
  );

  return { service, userModel, dataDeletionService, mailService };
}

describe('TrialService.runTrialSweep', () => {
  it('erases an expired trial along with the organizations it owns', async () => {
    const { service, dataDeletionService } = build({
      toDelete: [expiredUser],
    });

    const result = await service.runTrialSweep();

    expect(dataDeletionService.purgeTrialAccount).toHaveBeenCalledWith(
      USER_ID.toString(),
      [ORG_ID],
    );
    expect(result.deleted).toBe(1);
  });

  it('never erases an account covered by a paying organization', async () => {
    const { service, dataDeletionService } = build({
      toDelete: [expiredUser],
      sponsored: true,
    });

    const result = await service.runTrialSweep();

    expect(dataDeletionService.purgeTrialAccount).not.toHaveBeenCalled();
    expect(result.deleted).toBe(0);
  });

  it('deletes nothing when mail is disabled, so nobody is erased unwarned', async () => {
    const { service, dataDeletionService } = build({
      toDelete: [expiredUser],
      mailEnabled: false,
    });

    const result = await service.runTrialSweep();

    expect(dataDeletionService.purgeTrialAccount).not.toHaveBeenCalled();
    expect(result.deleted).toBe(0);
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

  it('leaves the warning unstamped when the email fails, so it retries', async () => {
    const { service, userModel } = build({
      toWarn: [expiredUser],
      mailThrows: true,
    });

    const result = await service.runTrialSweep();

    expect(userModel.updateOne).not.toHaveBeenCalled();
    expect(result.warned).toBe(0);
  });

  it('keeps going after one account fails to erase', async () => {
    const second = { ...expiredUser, _id: new Types.ObjectId() };
    const { service, dataDeletionService } = build({
      toDelete: [expiredUser, second],
    });
    dataDeletionService.purgeTrialAccount
      .mockRejectedValueOnce(new Error('mongo timeout'))
      .mockResolvedValueOnce(undefined);

    const result = await service.runTrialSweep();

    expect(dataDeletionService.purgeTrialAccount).toHaveBeenCalledTimes(2);
    expect(result.deleted).toBe(1);
  });
});

import { Types } from 'mongoose';

import { OnboardingStepKey } from './onboarding.constants';
import { OnboardingService } from './onboarding.service';

const ORG_ID = new Types.ObjectId().toString();
const USER_ID = new Types.ObjectId().toString();

/** `Model.exists()` stub: resolves to a doc when the collection has a match. */
const existsModel = (present: boolean) => ({
  exists: jest.fn(() => ({
    exec: jest
      .fn()
      .mockResolvedValue(present ? { _id: new Types.ObjectId() } : null),
  })),
});

interface ProgressStub {
  dismissedAt?: Date | null;
  completedAt?: Date | null;
  completionAcknowledgedAt?: Date | null;
}

interface Deps {
  media?: boolean;
  playlist?: boolean;
  screen?: boolean;
  pair?: boolean;
  assign?: boolean;
  progress?: ProgressStub | null;
}

function build(deps: Deps = {}) {
  // One screen model answers two questions — "any screen?" and "any screen with
  // items?" — in the order the service asks them.
  const screenModel = {
    exists: jest
      .fn()
      .mockReturnValueOnce({
        exec: jest
          .fn()
          .mockResolvedValue(
            deps.screen ? { _id: new Types.ObjectId() } : null,
          ),
      })
      .mockReturnValueOnce({
        exec: jest
          .fn()
          .mockResolvedValue(
            deps.assign ? { _id: new Types.ObjectId() } : null,
          ),
      }),
  };

  const repository = {
    find: jest.fn().mockResolvedValue(deps.progress ?? null),
    upsert: jest.fn((_userId: string, _orgId: string, update: ProgressStub) =>
      Promise.resolve({ ...(deps.progress ?? {}), ...update }),
    ),
  };

  const service = new OnboardingService(
    existsModel(deps.media ?? false) as never,
    existsModel(deps.playlist ?? false) as never,
    screenModel as never,
    existsModel(deps.pair ?? false) as never,
    repository as never,
  );

  return { service, repository };
}

const doneKeys = (steps: { key: OnboardingStepKey; done: boolean }[]) =>
  steps.filter((step) => step.done).map((step) => step.key);

describe('OnboardingService.getState', () => {
  it('derives each step from the organization’s content', async () => {
    const { service } = build({ media: true, screen: true, assign: true });

    const state = await service.getState(USER_ID, ORG_ID);

    expect(doneKeys(state.steps)).toEqual(['media', 'screen', 'assign']);
    expect(state.completedCount).toBe(3);
    expect(state.percent).toBe(60);
    // The first unfinished step, not merely the first undone one found.
    expect(state.currentStep).toBe('playlist');
    expect(state.status).toBe('active');
    expect(state.showCelebration).toBe(false);
  });

  it('stamps completion once and offers the celebration', async () => {
    const { service, repository } = build({
      media: true,
      playlist: true,
      screen: true,
      pair: true,
      assign: true,
    });

    const state = await service.getState(USER_ID, ORG_ID);

    expect(repository.upsert).toHaveBeenCalledWith(USER_ID, ORG_ID, {
      completedAt: expect.any(Date) as Date,
    });
    expect(state.status).toBe('completed');
    expect(state.percent).toBe(100);
    expect(state.currentStep).toBeNull();
    expect(state.showCelebration).toBe(true);
  });

  it('does not re-stamp completion, and drops the celebration once seen', async () => {
    const { service, repository } = build({
      media: true,
      playlist: true,
      screen: true,
      pair: true,
      assign: true,
      progress: {
        completedAt: new Date('2026-08-01'),
        completionAcknowledgedAt: new Date('2026-08-02'),
      },
    });

    const state = await service.getState(USER_ID, ORG_ID);

    expect(repository.upsert).not.toHaveBeenCalled();
    expect(state.completedAt).toBe(new Date('2026-08-01').toISOString());
    expect(state.showCelebration).toBe(false);
  });

  it('reports a dismissed checklist as dismissed even while unfinished', async () => {
    const { service } = build({
      media: true,
      progress: { dismissedAt: new Date('2026-08-03') },
    });

    const state = await service.getState(USER_ID, ORG_ID);

    expect(state.status).toBe('dismissed');
    expect(state.showCelebration).toBe(false);
  });
});

describe('OnboardingService.update', () => {
  it('clears the dismissal when the checklist is brought back', async () => {
    const { service, repository } = build({
      media: true,
      progress: { dismissedAt: new Date('2026-08-03') },
    });

    const state = await service.update(USER_ID, ORG_ID, { dismissed: false });

    expect(repository.upsert).toHaveBeenCalledWith(USER_ID, ORG_ID, {
      dismissedAt: null,
    });
    expect(state.status).toBe('active');
  });

  it('acknowledging completion is what retires the checklist', async () => {
    const { service, repository } = build({
      media: true,
      playlist: true,
      screen: true,
      pair: true,
      assign: true,
      progress: { completedAt: new Date('2026-08-01') },
    });

    const state = await service.update(USER_ID, ORG_ID, {
      completionAcknowledged: true,
    });

    expect(repository.upsert).toHaveBeenCalledWith(USER_ID, ORG_ID, {
      completionAcknowledgedAt: expect.any(Date) as Date,
    });
    expect(state.status).toBe('completed');
    expect(state.showCelebration).toBe(false);
  });
});

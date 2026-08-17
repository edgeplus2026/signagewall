import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  OnboardingProgress,
  OnboardingProgressDocument,
} from './schemas/onboarding-progress.schema';

@Injectable()
export class OnboardingRepository {
  constructor(
    @InjectModel(OnboardingProgress.name)
    private readonly progressModel: Model<OnboardingProgressDocument>,
  ) {}

  find(
    userId: string,
    organizationId: string,
  ): Promise<OnboardingProgressDocument | null> {
    return this.progressModel
      .findOne({
        userId: new Types.ObjectId(userId),
        organizationId: new Types.ObjectId(organizationId),
      })
      .exec();
  }

  /**
   * Applies a partial update, creating the record on first touch. Reading the
   * checklist is a GET and must not write, so the row only appears once the
   * user does something with it — dismisses it, or finishes it.
   */
  upsert(
    userId: string,
    organizationId: string,
    update: Partial<
      Pick<
        OnboardingProgress,
        'dismissedAt' | 'completedAt' | 'completionAcknowledgedAt'
      >
    >,
  ): Promise<OnboardingProgressDocument> {
    return this.progressModel
      .findOneAndUpdate(
        {
          userId: new Types.ObjectId(userId),
          organizationId: new Types.ObjectId(organizationId),
        },
        { $set: update },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .orFail()
      .exec();
  }
}

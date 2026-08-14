import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { QueryFilter } from 'mongoose';

import { MediaItem, MediaItemType } from '../media/schemas/media-item.schema';
import { Playlist } from '../playlists/schemas/playlist.schema';
import { Device, DeviceStatus } from '../player/schemas/device.schema';
import { Screen } from '../screens/schemas/screen.schema';
import {
  OnboardingStateDto,
  toOnboardingState,
} from './mappers/onboarding.mapper';
import { OnboardingStepKey } from './onboarding.constants';
import { OnboardingRepository } from './onboarding.repository';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';

@Injectable()
export class OnboardingService {
  constructor(
    @InjectModel(MediaItem.name)
    private readonly mediaModel: Model<MediaItem>,
    @InjectModel(Playlist.name)
    private readonly playlistModel: Model<Playlist>,
    @InjectModel(Screen.name) private readonly screenModel: Model<Screen>,
    @InjectModel(Device.name) private readonly deviceModel: Model<Device>,
    private readonly repository: OnboardingRepository,
  ) {}

  async getState(
    userId: string,
    organizationId: string,
  ): Promise<OnboardingStateDto> {
    const [done, progress] = await Promise.all([
      this.resolveSteps(organizationId),
      this.repository.find(userId, organizationId),
    ]);

    const state = toOnboardingState(done, progress);

    // Stamp the finish line the first time we see it, so "when did this account
    // get going" is answerable later and the celebration is shown exactly once.
    if (state.completedCount === state.totalCount && !progress?.completedAt) {
      const stamped = await this.repository.upsert(userId, organizationId, {
        completedAt: new Date(),
      });
      return toOnboardingState(done, stamped);
    }

    return state;
  }

  async update(
    userId: string,
    organizationId: string,
    dto: UpdateOnboardingDto,
  ): Promise<OnboardingStateDto> {
    const now = new Date();
    const update: Parameters<OnboardingRepository['upsert']>[2] = {};

    if (dto.dismissed !== undefined) {
      update.dismissedAt = dto.dismissed ? now : null;
    }

    if (dto.completionAcknowledged) {
      update.completionAcknowledgedAt = now;
    }

    // An empty PATCH is a read. Sending it on as an empty update document would
    // reach Mongo as a *replacement*, which is how a no-op erases a record.
    if (Object.keys(update).length === 0) {
      return this.getState(userId, organizationId);
    }

    const [done, progress] = await Promise.all([
      this.resolveSteps(organizationId),
      this.repository.upsert(userId, organizationId, update),
    ]);

    return toOnboardingState(done, progress);
  }

  /**
   * Which steps the organization has actually completed. Five existence checks
   * rather than five counts — the checklist only ever asks "is there any?", and
   * each one stops at the first matching document.
   */
  private async resolveSteps(
    organizationId: string,
  ): Promise<Record<OnboardingStepKey, boolean>> {
    const orgId = new Types.ObjectId(organizationId);

    const [media, playlist, screen, pair, assign] = await Promise.all([
      // Folders are organization, not content — an empty folder is not a step.
      this.exists(this.mediaModel, {
        organizationId: orgId,
        type: { $in: [MediaItemType.IMAGE, MediaItemType.VIDEO] },
      }),
      this.exists(this.playlistModel, { organizationId: orgId }),
      this.exists(this.screenModel, { organizationId: orgId }),
      this.exists(this.deviceModel, {
        organizationId: orgId,
        status: DeviceStatus.PAIRED,
      }),
      this.exists(this.screenModel, {
        organizationId: orgId,
        itemCount: { $gt: 0 },
      }),
    ]);

    return { media, playlist, screen, pair, assign };
  }

  private async exists<T>(
    model: Model<T>,
    filter: QueryFilter<T>,
  ): Promise<boolean> {
    return (await model.exists(filter).exec()) !== null;
  }
}

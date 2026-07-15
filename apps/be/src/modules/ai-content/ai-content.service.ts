import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { DateTime } from 'luxon';
import { I18nService } from 'nestjs-i18n';

import { ErrorCodes } from '../../common/constants/error-codes';
import { BusinessException } from '../../common/exceptions/business.exception';
import {
  AI_CONTENT_GENERATE_JOB,
  AI_CONTENT_QUEUE,
} from './ai-content.constants';
import { AiContentMaterializer } from './ai-content.materializer';
import { AiContentRepository } from './ai-content.repository';
import { CreateAiGenerationDto } from './dto/create-ai-generation.dto';
import {
  AiGenerationResponseDto,
  toAiGenerationResponse,
} from './mappers/ai-generation.mapper';
import {
  AI_CONTENT_PROVIDER,
  type AiContentProvider,
} from './providers/ai-provider.interface';

@Injectable()
export class AiContentService {
  private readonly logger = new Logger(AiContentService.name);

  constructor(
    @InjectQueue(AI_CONTENT_QUEUE) private readonly queue: Queue,
    private readonly repository: AiContentRepository,
    private readonly materializer: AiContentMaterializer,
    private readonly configService: ConfigService,
    private readonly i18n: I18nService,
    @Inject(AI_CONTENT_PROVIDER) private readonly provider: AiContentProvider,
  ) {}

  /**
   * Enforce the per-user daily quota, persist the generation as `queued`, then
   * enqueue the background job. The Mongo record is the durable source of truth;
   * BullMQ only carries the id.
   */
  async enqueue(
    organizationId: string,
    userId: string,
    dto: CreateAiGenerationDto,
  ): Promise<AiGenerationResponseDto> {
    if (!this.provider.isConfigured()) {
      throw new BusinessException(
        ErrorCodes.INTERNAL_ERROR,
        this.i18n.t('ai-content.notConfigured'),
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const dailyLimit =
      this.configService.get<number>('aiContent.dailyLimit') ?? 10;
    // UTC day boundary — the quota resets at 00:00 UTC.
    const since = DateTime.utc().startOf('day').toJSDate();
    const used = await this.repository.countForUserSince(userId, since);
    if (used >= dailyLimit) {
      throw new BusinessException(
        ErrorCodes.TOO_MANY_REQUESTS,
        this.i18n.t('ai-content.dailyLimit'),
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const doc = await this.repository.create({
      organizationId,
      userId,
      input: dto,
    });
    const generationId = doc._id.toString();

    try {
      await this.queue.add(
        AI_CONTENT_GENERATE_JOB,
        { generationId },
        { jobId: generationId },
      );
    } catch (error) {
      // Redis unreachable — surface as unavailable and mark the record failed so
      // it isn't left dangling in `queued` forever.
      this.logger.error(
        `Failed to enqueue generation ${generationId}`,
        error as Error,
      );
      await this.repository.markFailed(generationId, 'Queue unavailable');
      throw new BusinessException(
        ErrorCodes.INTERNAL_ERROR,
        this.i18n.t('ai-content.queueUnavailable'),
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return toAiGenerationResponse(doc);
  }

  async listForUser(
    organizationId: string,
    userId: string,
  ): Promise<AiGenerationResponseDto[]> {
    const docs = await this.repository.listForUser(organizationId, userId);
    return docs.map(toAiGenerationResponse);
  }

  async getForUser(
    organizationId: string,
    userId: string,
    id: string,
  ): Promise<AiGenerationResponseDto> {
    const doc = await this.repository.findByIdScoped(
      organizationId,
      userId,
      id,
    );
    if (!doc) {
      throw BusinessException.notFound(this.i18n.t('ai-content.notFound'));
    }
    return toAiGenerationResponse(doc);
  }

  async deleteForUser(
    organizationId: string,
    userId: string,
    id: string,
  ): Promise<void> {
    const deleted = await this.repository.deleteForUser(
      organizationId,
      userId,
      id,
    );
    if (!deleted) {
      throw BusinessException.notFound(this.i18n.t('ai-content.notFound'));
    }
  }

  async materialize(
    organizationId: string,
    userId: string,
    id: string,
    name?: string,
  ): Promise<{ playlistId: string }> {
    const doc = await this.repository.findByIdScoped(
      organizationId,
      userId,
      id,
    );
    if (!doc) {
      throw BusinessException.notFound(this.i18n.t('ai-content.notFound'));
    }
    return this.materializer.materialize(organizationId, doc, name);
  }
}

import { Inject, Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bullmq';

import type {
  AiGeneratedContent,
  AiGenerationInput,
} from '@edge/apps-contract';

import {
  StockMediaTypeFilter,
  StockOrientation,
} from '../stock-media/stock-media.constants';
import {
  STOCK_MEDIA_PROVIDER,
  type StockMediaProvider,
} from '../stock-media/providers/stock-media-provider.interface';
import {
  AI_CONTENT_QUEUE,
  AI_CONTENT_WORKER_CONCURRENCY,
} from './ai-content.constants';
import { AiContentChangedEvent, AiContentEvents } from './ai-content.events';
import { AiContentRepository } from './ai-content.repository';
import { parseGeneratedContent } from './ai-content.util';
import {
  AI_CONTENT_PROVIDER,
  type AiContentProvider,
} from './providers/ai-provider.interface';
import { AiGenerationStatus } from './schemas/ai-generation.schema';

interface GenerateJobData {
  generationId: string;
}

/**
 * In-process BullMQ worker for content generation. Runs inside the single Nest
 * process today; can later be extracted to a standalone worker (its only
 * cross-process dependency is the `EventEmitter2` completion nudge, which would
 * then move to BullMQ `QueueEvents` / Redis pub-sub).
 */
@Processor(AI_CONTENT_QUEUE, { concurrency: AI_CONTENT_WORKER_CONCURRENCY })
export class AiContentProcessor extends WorkerHost {
  private readonly logger = new Logger(AiContentProcessor.name);

  constructor(
    private readonly repository: AiContentRepository,
    @Inject(AI_CONTENT_PROVIDER) private readonly provider: AiContentProvider,
    @Inject(STOCK_MEDIA_PROVIDER)
    private readonly stockMedia: StockMediaProvider,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job<GenerateJobData>): Promise<void> {
    const { generationId } = job.data;
    const doc = await this.repository.findById(generationId);
    if (!doc) {
      this.logger.warn(`Generation ${generationId} not found; skipping job`);
      return;
    }
    // Already finalized (e.g. a duplicate delivery) — nothing to do.
    if (
      doc.status === AiGenerationStatus.SUCCEEDED ||
      doc.status === AiGenerationStatus.FAILED
    ) {
      return;
    }

    await this.repository.markProcessing(generationId, job.id);

    const slideCount =
      this.configService.get<number>('aiContent.defaultSlides') ?? 5;

    // Throwing here (bad JSON / schema mismatch / provider error) lets BullMQ
    // retry per the queue's `attempts`; `onFailed` finalizes after the last one.
    const raw = await this.provider.generate(doc.input, { slideCount });
    const parsed = parseGeneratedContent(raw);

    // Fetch a relevant stock photo for each slide (best-effort; never fails the
    // generation). Runs after validation so text is preserved even if images
    // can't be resolved.
    const result = await this.enrichWithImages(doc.input, parsed);

    await this.repository.markSucceeded(generationId, {
      result,
      provider: this.provider.name,
      model: this.provider.model,
    });

    // Emit only after the write commits (matches the codebase's emit-after-write
    // convention), so a client refetch always observes the succeeded state.
    this.emitChanged(
      doc.organizationId.toString(),
      doc.userId.toString(),
      generationId,
      'succeeded',
    );
  }

  @OnWorkerEvent('failed')
  async onFailed(
    job: Job<GenerateJobData> | undefined,
    error: Error,
  ): Promise<void> {
    if (!job) {
      return;
    }
    const maxAttempts = job.opts.attempts ?? 1;
    if (job.attemptsMade < maxAttempts) {
      // Retries remain; leave the job in `processing` until they are exhausted.
      return;
    }

    const { generationId } = job.data;
    await this.repository.markFailed(
      generationId,
      error?.message ?? 'Generation failed',
    );
    const doc = await this.repository.findById(generationId);
    if (doc) {
      this.emitChanged(
        doc.organizationId.toString(),
        doc.userId.toString(),
        generationId,
        'failed',
      );
    }
  }

  /**
   * Attach a relevant stock photo URL to each slide via the stock-media
   * provider. Best-effort: a missing key or a failed lookup just leaves the
   * slide without an image (it falls back to a solid background).
   */
  private async enrichWithImages(
    input: AiGenerationInput,
    content: AiGeneratedContent,
  ): Promise<AiGeneratedContent> {
    if (!this.stockMedia.isConfigured()) {
      return content;
    }

    const slides = await Promise.all(
      content.slides.map(async (slide) => {
        const query = (slide.imageQuery?.trim() || this.fallbackQuery(input))
          .trim()
          .slice(0, 100);
        if (!query) {
          return slide;
        }
        try {
          const page = await this.stockMedia.search({
            query,
            page: 1,
            perPage: 3,
            mediaType: StockMediaTypeFilter.IMAGE,
            orientation: StockOrientation.LANDSCAPE,
          });
          const url = page.items[0]?.previewUrl;
          return url ? { ...slide, imageUrl: url } : slide;
        } catch (error) {
          this.logger.warn(
            `Stock image lookup failed for "${query}"`,
            error as Error,
          );
          return slide;
        }
      }),
    );

    return { ...content, slides };
  }

  private fallbackQuery(input: AiGenerationInput): string {
    return [input.businessName, input.industry].filter(Boolean).join(' ');
  }

  private emitChanged(
    organizationId: string,
    userId: string,
    generationId: string,
    status: string,
  ): void {
    this.eventEmitter.emit(AiContentEvents.Changed, {
      organizationId,
      userId,
      generationId,
      status,
    } satisfies AiContentChangedEvent);
  }
}

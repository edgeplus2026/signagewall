import { Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';
import { AppDataCacheRepository } from './app-data-cache.repository';
import { AppDataService } from './app-data.service';

/**
 * How long to hold a ping before acting on it, coalescing whatever else arrives for
 * the same calendar in the meantime.
 *
 * Google's notification says only "something in this calendar changed" — it carries
 * no diff — and one human action can produce several of them (dragging an event fires
 * for the move, and a recurring series fires per instance). Acting on each would
 * re-fetch the whole calendar and re-push every screen showing it, several times, for
 * one edit. Two seconds collapses that burst into the single fetch it always was.
 */
const COALESCE_MS = 2_000;

/**
 * Provider change notifications.
 *
 * PUBLIC AND UNAUTHENTICATED, because the caller is Google and it has no token of
 * ours to present. What authenticates a ping instead is the channel id: a UUID we
 * generated, told only to Google, and stored against exactly one cache key. A ping
 * whose channel id matches nothing is dropped — a stranger POSTing here has nothing
 * to match with, and the worst they can do is make us look up a row.
 *
 * It answers 200 to everything, including the pings it drops. That is not laziness:
 * a non-2xx makes Google retry with backoff and eventually kill the channel, so
 * arguing with it about a channel we no longer recognise would cost us the channels
 * we do.
 *
 * This endpoint is an ACCELERATOR. Every calendar is still polled on its manifest
 * cadence, and it has to be: a channel expires after days, a ping can be lost, and a
 * deployment with no public URL never subscribes at all. Nothing here is the only
 * thing keeping a screen current.
 */
@ApiExcludeController()
@Controller('webhooks/google')
export class WebhooksController {
  /** cacheKey → the pending coalesced refresh. */
  private readonly pending = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly appDataService: AppDataService,
    private readonly cacheRepository: AppDataCacheRepository,
  ) {}

  @Public()
  @Post('calendar')
  @HttpCode(200)
  async calendar(
    @Headers('x-goog-channel-id') channelId?: string,
    @Headers('x-goog-resource-state') resourceState?: string,
  ): Promise<void> {
    // The handshake Google sends the moment a channel is registered. It means "you
    // are subscribed", not "something changed" — refreshing on it would fetch the
    // calendar we have this second finished fetching.
    if (!channelId || resourceState === 'sync') {
      return;
    }

    const entry = await this.cacheRepository.findByChannelId(channelId);
    if (!entry) {
      return;
    }
    this.schedule(entry.cacheKey);
  }

  /**
   * Refresh this key once, shortly. A second ping for the same calendar inside the
   * window replaces the first rather than queueing behind it.
   */
  private schedule(cacheKey: string): void {
    const existing = this.pending.get(cacheKey);
    if (existing) {
      clearTimeout(existing);
    }
    const timer = setTimeout(() => {
      this.pending.delete(cacheKey);
      // Fire and forget: the caller (Google) has already been answered, and a failure
      // here costs at most one push — the poll picks the change up regardless.
      void this.appDataService.refreshCacheKey(cacheKey).catch(() => undefined);
    }, COALESCE_MS);
    // Don't hold the process open on a pending refresh during shutdown.
    timer.unref?.();
    this.pending.set(cacheKey, timer);
  }
}

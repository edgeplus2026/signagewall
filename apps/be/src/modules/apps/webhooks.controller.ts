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
 * Ceiling on that hold, measured from the FIRST ping of a burst.
 *
 * {@link schedule} restarts the window on every ping, which is what makes it
 * coalesce — but a restart with no ceiling is a debounce that can starve: while
 * pings keep landing closer together than {@link COALESCE_MS}, the refresh is
 * pushed back forever and the screen never updates until the edits stop. Google
 * currently rate-limits Sheets notifications to roughly one per file per three
 * minutes, so nothing observed today comes close — but the provider's cadence is
 * not ours to rely on, and the failure mode is silent and unbounded.
 */
const MAX_COALESCE_MS = 10_000;

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
  /**
   * cacheKey → the pending coalesced refresh, with the instant the burst that
   * scheduled it began (so the hold can be capped, see {@link MAX_COALESCE_MS}).
   */
  private readonly pending = new Map<
    string,
    { timer: NodeJS.Timeout; burstStartedAt: number }
  >();

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
    await this.handleChannelPing(channelId, resourceState);
  }

  /**
   * Drive `files.watch` pings — the menu board's Google Sheets sync (and any
   * future file-backed tabular connector). Identical semantics to `calendar`:
   * a channel id we generated resolves to one cache key, and the ping carries
   * no diff, so all it does is schedule a coalesced re-fetch of that key.
   */
  @Public()
  @Post('drive')
  @HttpCode(200)
  async drive(
    @Headers('x-goog-channel-id') channelId?: string,
    @Headers('x-goog-resource-state') resourceState?: string,
  ): Promise<void> {
    await this.handleChannelPing(channelId, resourceState);
  }

  private async handleChannelPing(
    channelId?: string,
    resourceState?: string,
  ): Promise<void> {
    // The handshake Google sends the moment a channel is registered. It means "you
    // are subscribed", not "something changed" — refreshing on it would fetch the
    // resource we have this second finished fetching.
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
   * window replaces the first rather than queueing behind it — but never past
   * {@link MAX_COALESCE_MS} from the ping that opened the burst, so an unbroken
   * stream of pings still gets served instead of deferring the refresh forever.
   */
  private schedule(cacheKey: string): void {
    const existing = this.pending.get(cacheKey);
    const burstStartedAt = existing?.burstStartedAt ?? Date.now();
    if (existing) {
      clearTimeout(existing.timer);
    }
    const delay = Math.max(
      0,
      Math.min(COALESCE_MS, burstStartedAt + MAX_COALESCE_MS - Date.now()),
    );
    const timer = setTimeout(() => {
      this.pending.delete(cacheKey);
      // Fire and forget: the caller (Google) has already been answered, and a failure
      // here costs at most one push — the poll picks the change up regardless.
      void this.appDataService.refreshCacheKey(cacheKey).catch(() => undefined);
    }, delay);
    // Don't hold the process open on a pending refresh during shutdown.
    timer.unref?.();
    this.pending.set(cacheKey, { timer, burstStartedAt });
  }
}

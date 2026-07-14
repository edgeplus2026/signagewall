import { WebhooksController } from './webhooks.controller';

/**
 * The push endpoint. Everything worth testing here is a REFUSAL — the pings it must
 * not act on — plus the one thing that makes it safe to expose at all: several
 * notifications for the same calendar collapse into a single refresh.
 */
describe('WebhooksController (google calendar push)', () => {
  const flushCoalesceWindow = () => jest.advanceTimersByTime(2_500);

  function setup(entry: { cacheKey: string } | null) {
    const refreshCacheKey = jest.fn().mockResolvedValue(true);
    const findByChannelId = jest.fn().mockResolvedValue(entry);
    const controller = new WebhooksController(
      { refreshCacheKey } as never,
      { findByChannelId } as never,
    );
    return { controller, refreshCacheKey, findByChannelId };
  }

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('refreshes the cache key the channel belongs to', async () => {
    const { controller, refreshCacheKey, findByChannelId } = setup({
      cacheKey: 'gcal:conn-1:primary',
    });

    await controller.calendar('chan-1', 'exists');
    flushCoalesceWindow();

    expect(findByChannelId).toHaveBeenCalledWith('chan-1');
    expect(refreshCacheKey).toHaveBeenCalledWith('gcal:conn-1:primary');
  });

  // Google sends this the instant a channel is registered. It means "you are
  // subscribed", not "something changed" — acting on it would re-fetch the calendar
  // we have this second finished fetching.
  it('ignores the `sync` handshake', async () => {
    const { controller, refreshCacheKey, findByChannelId } = setup({
      cacheKey: 'gcal:conn-1:primary',
    });

    await controller.calendar('chan-1', 'sync');
    flushCoalesceWindow();

    expect(findByChannelId).not.toHaveBeenCalled();
    expect(refreshCacheKey).not.toHaveBeenCalled();
  });

  // The channel id is the only thing authenticating this endpoint: a UUID we
  // generated and told nobody but Google. One that matches no row is a stranger.
  it('drops a ping whose channel id matches nothing', async () => {
    const { controller, refreshCacheKey } = setup(null);

    await controller.calendar('chan-nobody-knows', 'exists');
    flushCoalesceWindow();

    expect(refreshCacheKey).not.toHaveBeenCalled();
  });

  it('drops a ping with no channel id at all', async () => {
    const { controller, refreshCacheKey, findByChannelId } = setup({
      cacheKey: 'gcal:conn-1:primary',
    });

    await controller.calendar(undefined, 'exists');
    flushCoalesceWindow();

    expect(findByChannelId).not.toHaveBeenCalled();
    expect(refreshCacheKey).not.toHaveBeenCalled();
  });

  // One human action can produce several notifications (a drag fires for the move; a
  // recurring series fires per instance). Acting on each would re-fetch the whole
  // calendar and re-push every screen showing it, several times, for one edit.
  it('collapses a burst of pings for one calendar into a single refresh', async () => {
    const { controller, refreshCacheKey } = setup({
      cacheKey: 'gcal:conn-1:primary',
    });

    await controller.calendar('chan-1', 'exists');
    jest.advanceTimersByTime(500);
    await controller.calendar('chan-1', 'exists');
    jest.advanceTimersByTime(500);
    await controller.calendar('chan-1', 'exists');

    // Nothing has fired yet — the window keeps being pushed out.
    expect(refreshCacheKey).not.toHaveBeenCalled();

    flushCoalesceWindow();
    expect(refreshCacheKey).toHaveBeenCalledTimes(1);
  });
});

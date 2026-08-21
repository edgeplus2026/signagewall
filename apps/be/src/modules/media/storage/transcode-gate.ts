/**
 * Caps how many tasks run at once, admitting waiters in arrival order.
 *
 * Distinct from `mapWithConcurrency` in the cloud-import constants, which bounds
 * a batch the caller already holds. This bounds callers that arrive
 * independently and know nothing about each other — one upload request has no
 * idea how many others are mid-encode — which is exactly the case where the
 * server, not the client, has to be the one counting.
 */
export class ConcurrencyGate {
  private active = 0;
  private readonly waiting: (() => void)[] = [];

  constructor(private readonly limit: number) {}

  /** In-flight tasks, for tests and diagnostics. */
  get inFlight(): number {
    return this.active;
  }

  /** Tasks parked waiting for a slot. */
  get queued(): number {
    return this.waiting.length;
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.release();
    }
  }

  private async acquire(): Promise<void> {
    if (this.active < this.limit) {
      this.active += 1;
      return;
    }
    // The slot is handed over already counted (see `release`), so nothing has
    // to be incremented on the way out of this await — which is what stops a
    // caller arriving in the gap from over-subscribing the limit.
    await new Promise<void>((resolve) => this.waiting.push(resolve));
  }

  private release(): void {
    const next = this.waiting.shift();
    if (next) {
      next();
      return;
    }
    this.active -= 1;
  }
}

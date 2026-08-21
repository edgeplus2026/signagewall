import { ConcurrencyGate } from './transcode-gate';

/** A task that finishes only when the returned `release` is called. */
function controllable(): { task: () => Promise<void>; release: () => void } {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { task: () => promise, release };
}

describe('ConcurrencyGate', () => {
  it('never runs more than the limit at once', async () => {
    const gate = new ConcurrencyGate(2);
    const a = controllable();
    const b = controllable();
    const c = controllable();

    void gate.run(a.task);
    void gate.run(b.task);
    void gate.run(c.task);
    await Promise.resolve();

    expect(gate.inFlight).toBe(2);
    expect(gate.queued).toBe(1);

    a.release();
    b.release();
    c.release();
  });

  it('does not over-subscribe when a slot changes hands', async () => {
    // The slot is handed to the waiter already counted. Releasing and then
    // re-counting would leave a gap in which an arriving caller sees a free
    // slot that is already spoken for, and the limit is briefly exceeded.
    const gate = new ConcurrencyGate(1);
    const first = controllable();
    const second = controllable();
    const third = controllable();

    void gate.run(first.task);
    void gate.run(second.task);
    await Promise.resolve();

    first.release();
    void gate.run(third.task); // arrives in the handover gap
    await Promise.resolve();
    await Promise.resolve();

    expect(gate.inFlight).toBe(1);

    second.release();
    third.release();
  });

  it('admits waiters in the order they arrived', async () => {
    const gate = new ConcurrencyGate(1);
    const blocker = controllable();
    const order: string[] = [];

    void gate.run(blocker.task);
    void gate.run(async () => {
      order.push('first');
    });
    void gate.run(async () => {
      order.push('second');
    });

    blocker.release();
    await new Promise((resolve) => setImmediate(resolve));

    expect(order).toEqual(['first', 'second']);
  });

  it('frees the slot when a task throws', async () => {
    const gate = new ConcurrencyGate(1);

    await expect(
      gate.run(() => Promise.reject(new Error('encoder died'))),
    ).rejects.toThrow('encoder died');

    expect(gate.inFlight).toBe(0);
    await expect(gate.run(() => Promise.resolve('next'))).resolves.toBe('next');
  });
});

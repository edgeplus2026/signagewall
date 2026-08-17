import type { Model } from 'mongoose';

import { DevicesRepository } from './devices.repository';
import type { DeviceDocument } from './schemas/device.schema';

function buildRepository() {
  const findOneAndUpdate = jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue(null),
  });
  const model = { findOneAndUpdate } as unknown as Model<DeviceDocument>;
  return {
    repository: new DevicesRepository(model),
    findOneAndUpdate,
    call: () => findOneAndUpdate.mock.calls[0] as [unknown, unknown, unknown],
  };
}

describe('DevicesRepository.setPresence', () => {
  it('asks for a pipeline update when it sends a pipeline', async () => {
    const { repository, call } = buildRepository();

    await repository.setPresence('device-1', true);

    const [, update, options] = call();
    // Coming online needs `$cond` to preserve an existing streak, which only an
    // aggregation pipeline can express — and Mongoose 9 refuses a pipeline
    // unless it is asked for. Without the option the driver never sees the
    // query: it throws inside the gateway's connect handler, the handler
    // answers a failed connect by disconnecting the socket, and every screen in
    // the fleet reconnects, fails again, and reports offline for good.
    expect(Array.isArray(update)).toBe(true);
    expect(options).toMatchObject({ updatePipeline: true });
  });

  it('keeps the offline path a plain update', async () => {
    const { repository, call } = buildRepository();

    await repository.setPresence('device-1', false);

    const [, update, options] = call();
    expect(Array.isArray(update)).toBe(false);
    expect(update).toMatchObject({ $unset: { onlineSince: '' } });
    // No pipeline, so no opt-in — and asking for one here would be a lie about
    // what is being sent.
    expect(options).not.toHaveProperty('updatePipeline');
  });

  it('carries a reported profile in either direction', async () => {
    const online = buildRepository();
    await online.repository.setPresence('device-1', true, {
      appVersion: '0.1.4',
    });
    expect(JSON.stringify(online.call()[1])).toContain('0.1.4');

    const offline = buildRepository();
    await offline.repository.setPresence('device-1', false, {
      appVersion: '0.1.4',
    });
    expect(JSON.stringify(offline.call()[1])).toContain('0.1.4');
  });
});

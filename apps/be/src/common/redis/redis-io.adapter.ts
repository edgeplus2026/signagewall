import { Logger, type INestApplicationContext } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import type { ServerOptions, Server } from 'socket.io';

import { buildRedisOptions } from './redis-connection';

/**
 * Socket.IO adapter backed by Redis pub/sub, so the realtime channel survives
 * running more than one API instance.
 *
 * Without it every room operation is process-local. `server.to(screenRoom).emit()`
 * reaches only the devices whose socket happens to live on the instance that
 * handled the content change; `fetchSockets()` on disconnect sees only local
 * sockets, so a device with a connection elsewhere is marked offline; and
 * `disconnectSockets()` on a revoke leaves the revoked device connected on every
 * other instance. The practical effect was that the API could not be scaled
 * horizontally at all, and a rolling deploy dropped the whole fleet at once.
 *
 * Optional by design. With no Redis configured this falls straight back to the
 * in-memory adapter, which is exactly right for a laptop or a single-instance
 * deployment — the same code path, one process, no infrastructure to run.
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter> | undefined;
  private clients: Redis[] = [];

  constructor(
    app: INestApplicationContext,
    private readonly config: ConfigService,
  ) {
    super(app);
  }

  /**
   * Opens the pub/sub pair. Returns false when there is nothing to connect to,
   * so the caller can log the (legitimate) single-instance case rather than
   * treating it as a failure.
   */
  async connect(): Promise<boolean> {
    const options = buildRedisOptions(this.config);
    if (!options) {
      return false;
    }

    // A subscriber connection cannot issue ordinary commands, so the adapter
    // needs its own pair rather than sharing BullMQ's client.
    const pubClient = new Redis({
      ...options,
      // Keep retrying rather than throwing: a Redis blip must not take the
      // realtime channel down permanently, and socket.io buffers through it.
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });
    const subClient = pubClient.duplicate();
    this.clients = [pubClient, subClient];

    for (const client of this.clients) {
      client.on('error', (error: Error) => {
        this.logger.error(`Redis adapter connection error: ${error.message}`);
      });
    }

    await Promise.all([pubClient.connect(), subClient.connect()]);
    this.adapterConstructor = createAdapter(pubClient, subClient);
    return true;
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options) as Server;
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }

  /** Closes the pub/sub pair on shutdown so a restart leaves no dangling clients. */
  async dispose(): Promise<void> {
    await Promise.all(
      this.clients.map((client) =>
        client.quit().catch(() => client.disconnect()),
      ),
    );
    this.clients = [];
  }
}

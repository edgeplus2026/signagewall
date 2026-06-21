import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ClientSession, Connection } from 'mongoose';

/**
 * Runs a unit of work inside a MongoDB transaction so multi-document writes
 * commit atomically (or roll back together on failure). Requires a replica
 * set / Atlas connection — which this project uses.
 *
 * Pass the provided `session` to every repository write inside `work`.
 */
@Injectable()
export class TransactionService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async run<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
    const session = await this.connection.startSession();
    try {
      let result: T;
      await session.withTransaction(async () => {
        result = await work(session);
      });
      // `withTransaction` resolves only after a successful commit.
      return result!;
    } finally {
      await session.endSession();
    }
  }
}

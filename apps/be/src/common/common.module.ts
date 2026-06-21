import { Global, Module } from '@nestjs/common';

import { TransactionService } from './services/transaction.service';

/**
 * Global module for cross-cutting providers that any feature module can use
 * without explicit imports (e.g. transactional helpers).
 */
@Global()
@Module({
  providers: [TransactionService],
  exports: [TransactionService],
})
export class CommonModule {}

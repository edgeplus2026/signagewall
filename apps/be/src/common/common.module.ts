import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { EncryptionService } from './services/encryption.service';
import { TransactionService } from './services/transaction.service';

/**
 * Global module for cross-cutting providers that any feature module can use
 * without explicit imports (e.g. transactional helpers, secret encryption).
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [TransactionService, EncryptionService],
  exports: [TransactionService, EncryptionService],
})
export class CommonModule {}

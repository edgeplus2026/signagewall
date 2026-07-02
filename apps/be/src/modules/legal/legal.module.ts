import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { LegalController } from './legal.controller';
import { LegalRepository } from './legal.repository';
import { LegalService } from './legal.service';
import {
  LegalAcceptance,
  LegalAcceptanceSchema,
} from './schemas/legal-acceptance.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LegalAcceptance.name, schema: LegalAcceptanceSchema },
    ]),
  ],
  controllers: [LegalController],
  providers: [LegalService, LegalRepository],
  // Exported so AuthService can record consent at registration and the GDPR
  // export/erasure paths can read/delete acceptances.
  exports: [LegalService, LegalRepository],
})
export class LegalModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { SuperAdminGuard } from '../admin/guards/super-admin.guard';
import { AnalyticsModule } from '../analytics/analytics.module';
import { MailModule } from '../mail/mail.module';
import { PlansModule } from '../plans/plans.module';
import { UsersModule } from '../users/users.module';
import { BillingAdminController } from './billing-admin.controller';
import { BillingReminderScheduler } from './billing-reminder.scheduler';
import { BillingRepository } from './billing.repository';
import { BillingService } from './billing.service';
import {
  BillingAccount,
  BillingAccountSchema,
} from './schemas/billing-account.schema';
import {
  ManualInvoice,
  ManualInvoiceSchema,
} from './schemas/manual-invoice.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BillingAccount.name, schema: BillingAccountSchema },
      { name: ManualInvoice.name, schema: ManualInvoiceSchema },
    ]),
    AnalyticsModule,
    UsersModule,
    PlansModule,
    MailModule,
  ],
  controllers: [BillingAdminController],
  providers: [
    BillingService,
    BillingRepository,
    BillingReminderScheduler,
    SuperAdminGuard,
  ],
  exports: [BillingService, BillingRepository],
})
export class BillingModule {}

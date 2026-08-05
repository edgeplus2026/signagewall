import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { SuperAdminGuard } from '../admin/guards/super-admin.guard';
import { AnalyticsModule } from '../analytics/analytics.module';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';
import { CrmController } from './crm.controller';
import { CrmRepository } from './crm.repository';
import { CrmService } from './crm.service';
import { CrmLead, CrmLeadSchema } from './schemas/crm-lead.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: CrmLead.name, schema: CrmLeadSchema }]),
    AnalyticsModule,
    MailModule,
    UsersModule,
  ],
  controllers: [CrmController],
  providers: [CrmService, CrmRepository, SuperAdminGuard],
})
export class CrmModule {}

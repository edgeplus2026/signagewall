import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { SuperAdminGuard } from '../admin/guards/super-admin.guard';
import { UsersModule } from '../users/users.module';
import { NotificationsAdminController } from './notifications-admin.controller';
import { NotificationsController } from './notifications.controller';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';
import {
  Notification,
  NotificationSchema,
} from './schemas/notification.schema';
import {
  NotificationReceipt,
  NotificationReceiptSchema,
} from './schemas/notification-receipt.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: NotificationReceipt.name, schema: NotificationReceiptSchema },
    ]),
    UsersModule,
  ],
  controllers: [NotificationsController, NotificationsAdminController],
  providers: [NotificationsService, NotificationsRepository, SuperAdminGuard],
})
export class NotificationsModule {}

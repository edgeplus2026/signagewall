import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { PlayerModule } from '../player/player.module';
import { ScreensModule } from '../screens/screens.module';
import { DeviceAlertsScheduler } from './device-alerts.scheduler';
import { DeviceAlertsService } from './device-alerts.service';

/**
 * Device-offline alerting. Consumes the player presence pipeline (offline state
 * + recovery events) and the reusable notifications inbox to alert operators
 * in-app. Depends on Screens (availability + mute), Organizations (alert
 * settings + recipients) and Notifications (system notifications).
 */
@Module({
  imports: [
    PlayerModule,
    ScreensModule,
    OrganizationsModule,
    NotificationsModule,
  ],
  providers: [DeviceAlertsService, DeviceAlertsScheduler],
})
export class DeviceAlertsModule {}

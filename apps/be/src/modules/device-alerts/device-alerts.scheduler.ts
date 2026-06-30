import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

import { DeviceAlertsService } from './device-alerts.service';

/**
 * Periodic sweep that turns "device offline past the threshold" into in-app
 * alerts. A CRON-style sweep (not per-disconnect timers) so it survives BE
 * restarts and stays correct with the incident state persisted on the device.
 */
@Injectable()
export class DeviceAlertsScheduler {
  private readonly logger = new Logger(DeviceAlertsScheduler.name);
  private running = false;

  constructor(private readonly deviceAlertsService: DeviceAlertsService) {}

  @Interval('device-offline-sweep', 60_000)
  async sweep(): Promise<void> {
    // Guard against overlapping runs if a sweep takes longer than the interval.
    if (this.running) {
      return;
    }

    this.running = true;
    try {
      await this.deviceAlertsService.sweep();
    } catch (error) {
      this.logger.error('Device offline-alert sweep failed', error);
    } finally {
      this.running = false;
    }
  }
}

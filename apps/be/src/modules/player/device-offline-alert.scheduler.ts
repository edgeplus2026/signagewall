import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

import { DeviceOfflineAlertService } from './device-offline-alert.service';

/**
 * Ticks the offline-alert sweep once a minute. Thin by design: the debounce,
 * grouping and recipient logic live in {@link DeviceOfflineAlertService} so
 * they stay unit-testable without timers.
 */
@Injectable()
export class DeviceOfflineAlertScheduler {
  private readonly logger = new Logger(DeviceOfflineAlertScheduler.name);
  private running = false;

  constructor(private readonly alertService: DeviceOfflineAlertService) {}

  @Interval('device-offline-alert', 60_000)
  async tick(): Promise<void> {
    // Guard against overlapping runs if a sweep outlasts the interval.
    if (this.running) {
      return;
    }

    this.running = true;
    try {
      await this.alertService.sweep();
    } catch (error) {
      this.logger.error('Device offline alert sweep failed', error);
    } finally {
      this.running = false;
    }
  }
}

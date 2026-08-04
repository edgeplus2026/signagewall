import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { FunnelEvent } from './schemas/funnel-event.schema';

/**
 * Optional consent-gated GA4 forwarding. Mongo remains the source of truth;
 * forwarding failures must never break an application lifecycle operation.
 */
@Injectable()
export class Ga4MeasurementService {
  private readonly logger = new Logger(Ga4MeasurementService.name);
  private readonly measurementId?: string;
  private readonly apiSecret?: string;

  constructor(config: ConfigService) {
    this.measurementId = config.get<string>('analytics.gaMeasurementId');
    this.apiSecret = config.get<string>('analytics.gaApiSecret');
  }

  async send(event: FunnelEvent): Promise<void> {
    if (!event.analyticsConsent || !this.measurementId || !this.apiSecret) {
      return;
    }

    const clientId = event.anonymousId ?? event.userId?.toString();
    if (!clientId) return;

    try {
      const response = await fetch(
        `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(this.measurementId)}&api_secret=${encodeURIComponent(this.apiSecret)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            client_id: clientId,
            user_id: event.userId?.toString(),
            events: [
              {
                name: event.eventName,
                params: {
                  ...(event.properties ?? {}),
                  source: event.firstTouch?.source,
                  medium: event.firstTouch?.medium,
                  campaign: event.firstTouch?.campaign,
                },
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        this.logger.warn(`GA4 rejected ${event.eventName}: ${response.status}`);
      }
    } catch (error) {
      this.logger.warn(
        `GA4 forwarding failed for ${event.eventName}: ${(error as Error).message}`,
      );
    }
  }
}

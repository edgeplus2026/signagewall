import { Injectable, Logger } from '@nestjs/common';
import { Types } from 'mongoose';

import { AnalyticsRepository } from './analytics.repository';
import { Ga4MeasurementService } from './ga4-measurement.service';
import {
  AttributionTouch,
  FunnelEventName,
} from './schemas/funnel-event.schema';

export interface AcquisitionPayload {
  version: 1;
  anonymousId?: string;
  firstTouch?: AttributionTouch;
  lastTouch?: AttributionTouch;
  analyticsConsent?: boolean;
}

export interface RecordFunnelEventInput {
  eventName: FunnelEventName;
  userId?: string;
  organizationId?: string;
  anonymousId?: string;
  acquisitionToken?: string;
  leadType?: 'contact' | 'quote';
  dedupeKey?: string;
  properties?: Record<string, unknown>;
  analyticsConsent?: boolean;
  source?: 'client' | 'server';
  occurredAt?: Date;
}

const PROPERTY_KEYS = new Set([
  'location',
  'cta',
  'form',
  'locale',
  'plan',
  'billingInterval',
  'currency',
  'valueMinor',
  'screenQuantity',
  'invoiceStatus',
  'authProvider',
]);

const FUNNEL_STAGES = [
  FunnelEventName.MARKETING_LANDING,
  FunnelEventName.MARKETING_CTA_CLICKED,
  FunnelEventName.GENERATE_LEAD,
  FunnelEventName.SIGN_UP,
  FunnelEventName.TRIAL_STARTED,
  FunnelEventName.ORGANIZATION_CREATED,
  FunnelEventName.SCREEN_CREATED,
  FunnelEventName.CONTENT_PUBLISHED,
  FunnelEventName.DEVICE_PAIRED,
  FunnelEventName.FIRST_SCREEN_ACTIVATED,
  FunnelEventName.SUBSCRIPTION_REQUESTED,
  FunnelEventName.INVOICE_ISSUED,
  FunnelEventName.PURCHASE,
] as const;

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly repository: AnalyticsRepository,
    private readonly ga4: Ga4MeasurementService,
  ) {}

  async record(input: RecordFunnelEventInput): Promise<void> {
    try {
      const token = this.parseAcquisitionToken(input.acquisitionToken);
      const anonymousId = this.text(
        input.anonymousId ?? token?.anonymousId,
        100,
      );
      const previous = await this.repository.findLatestForIdentity({
        userId: input.userId,
        anonymousId,
      });
      const firstTouch =
        this.sanitizeTouch(token?.firstTouch) ??
        this.sanitizeTouch(previous?.firstTouch);
      const lastTouch =
        this.sanitizeTouch(token?.lastTouch) ??
        this.sanitizeTouch(previous?.lastTouch) ??
        firstTouch;

      const event = await this.repository.create({
        eventName: input.eventName,
        occurredAt: input.occurredAt ?? new Date(),
        userId: input.userId ? new Types.ObjectId(input.userId) : null,
        organizationId: input.organizationId
          ? new Types.ObjectId(input.organizationId)
          : null,
        anonymousId,
        leadType: this.text(input.leadType, 160),
        dedupeKey: this.text(input.dedupeKey, 240),
        firstTouch,
        lastTouch,
        properties: this.sanitizeProperties(input.properties),
        analyticsConsent:
          input.analyticsConsent ?? token?.analyticsConsent ?? false,
        source: input.source ?? 'server',
      });

      if (event) void this.ga4.send(event);
    } catch (error) {
      // Analytics is intentionally best-effort and may not block core actions.
      this.logger.warn(
        `Could not record ${input.eventName}: ${(error as Error).message}`,
      );
    }
  }

  async getOverview(params: {
    from?: string;
    to?: string;
    recentLimit: number;
  }) {
    const to = params.to ? new Date(params.to) : new Date();
    let from = params.from
      ? new Date(params.from)
      : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (from > to) from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

    const result = await this.repository.overview({
      from,
      to,
      recentLimit: params.recentLimit,
    });
    const countMap = new Map(
      result.counts.map((item) => [item._id, item.count]),
    );
    const stages = FUNNEL_STAGES.map((eventName, index) => {
      const count = countMap.get(eventName) ?? 0;
      const previousCount =
        index === 0 ? null : (countMap.get(FUNNEL_STAGES[index - 1]) ?? 0);
      return {
        eventName,
        count,
        conversionFromPrevious:
          previousCount === null || previousCount === 0
            ? null
            : Math.round((count / previousCount) * 1000) / 10,
      };
    });

    return {
      range: { from: from.toISOString(), to: to.toISOString() },
      stages,
      acquisitions: result.acquisitions,
      recent: result.recent,
    };
  }

  parseAcquisitionToken(token?: string): AcquisitionPayload | undefined {
    if (!token || token.length > 4096) return undefined;
    try {
      const decoded = JSON.parse(
        Buffer.from(token, 'base64url').toString('utf8'),
      ) as AcquisitionPayload;
      if (decoded.version !== 1) return undefined;
      return {
        version: 1,
        anonymousId: this.text(decoded.anonymousId, 100),
        firstTouch: this.sanitizeTouch(decoded.firstTouch),
        lastTouch: this.sanitizeTouch(decoded.lastTouch),
        analyticsConsent: decoded.analyticsConsent === true,
      };
    } catch {
      return undefined;
    }
  }

  private sanitizeTouch(
    touch?: AttributionTouch,
  ): AttributionTouch | undefined {
    if (!touch || typeof touch !== 'object') return undefined;
    const occurredAt = touch.occurredAt
      ? new Date(touch.occurredAt)
      : undefined;
    const clean: AttributionTouch = {
      source: this.text(touch.source, 120),
      medium: this.text(touch.medium, 120),
      campaign: this.text(touch.campaign, 160),
      term: this.text(touch.term, 160),
      content: this.text(touch.content, 160),
      clickId: this.text(touch.clickId, 180),
      landingPath: this.text(touch.landingPath, 500),
      referrerDomain: this.text(touch.referrerDomain, 253),
      locale: this.text(touch.locale, 20),
      occurredAt:
        occurredAt && !Number.isNaN(occurredAt.getTime())
          ? occurredAt
          : undefined,
    };
    return Object.values(clean).some((value) => value !== undefined)
      ? clean
      : undefined;
  }

  private sanitizeProperties(
    properties?: Record<string, unknown>,
  ): Record<string, string | number | boolean> {
    if (!properties) return {};
    const clean: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(properties)) {
      if (!PROPERTY_KEYS.has(key)) continue;
      if (typeof value === 'string') clean[key] = value.slice(0, 160);
      else if (typeof value === 'number' && Number.isFinite(value))
        clean[key] = value;
      else if (typeof value === 'boolean') clean[key] = value;
    }
    return clean;
  }

  private text(value: unknown, max: number): string | undefined {
    return typeof value === 'string' && value.trim()
      ? value.trim().slice(0, max)
      : undefined;
  }
}

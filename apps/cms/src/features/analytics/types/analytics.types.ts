export type FunnelEventName =
  | 'marketing_landing'
  | 'marketing_cta_clicked'
  | 'quote_started'
  | 'generate_lead'
  | 'registration_started'
  | 'sign_up'
  | 'email_verified'
  | 'trial_started'
  | 'login'
  | 'organization_created'
  | 'screen_created'
  | 'content_published'
  | 'device_paired'
  | 'first_screen_activated'
  | 'subscription_requested'
  | 'invoice_issued'
  | 'payment_received'
  | 'purchase'
  | 'subscription_renewed'
  | 'payment_overdue'

export interface FunnelStage {
  eventName: FunnelEventName
  count: number
  conversionFromPrevious: number | null
}

export interface FunnelAcquisition {
  eventName: FunnelEventName
  source: string
  medium: string
  campaign: string
  count: number
}

export interface RecentFunnelEvent {
  _id: string
  eventName: FunnelEventName
  occurredAt: string
  userId: string | null
  organizationId: string | null
  anonymousId?: string
  leadType?: string
  firstTouch?: {
    source?: string
    medium?: string
    campaign?: string
  }
  properties: Record<string, string | number | boolean>
  source: 'client' | 'server'
}

export interface FunnelOverview {
  range: { from: string; to: string }
  stages: FunnelStage[]
  acquisitions: FunnelAcquisition[]
  recent: RecentFunnelEvent[]
}

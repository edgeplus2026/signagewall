import {
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { CLIENT_FUNNEL_EVENTS } from '../schemas/funnel-event.schema';

export class RecordFunnelEventDto {
  @IsIn(CLIENT_FUNNEL_EVENTS)
  eventName: (typeof CLIENT_FUNNEL_EVENTS)[number];

  @IsString()
  @MaxLength(100)
  anonymousId: string;

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  acquisitionToken?: string;

  @IsOptional()
  @IsIn(['contact', 'quote'])
  leadType?: 'contact' | 'quote';

  @IsOptional()
  @IsObject()
  properties?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  analyticsConsent?: boolean;
}

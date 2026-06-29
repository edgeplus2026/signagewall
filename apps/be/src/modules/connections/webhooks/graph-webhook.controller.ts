import {
  Body,
  Controller,
  Header,
  HttpCode,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';

import { Public } from '../../../common/decorators/public.decorator';
import { GraphWebhookService } from './graph-webhook.service';

/** One change notification from Microsoft Graph. */
interface GraphNotification {
  subscriptionId?: string;
  clientState?: string;
  resource?: string;
}

interface GraphNotificationBody {
  value?: GraphNotification[];
}

/**
 * Microsoft Graph webhook ingress. Two cases on the same endpoint:
 *  1. Subscription validation — Graph calls with `?validationToken=...`; we must
 *     echo it back as text/plain within 10s to prove we own the URL.
 *  2. Change notifications — a JSON body of `{ value: [...] }`; each is verified
 *     by its `clientState` before we trigger a refresh + fan-out.
 *
 * Public (no auth header): Graph can't carry our tokens. Authenticity comes from
 * the per-subscription `clientState` secret, not from the network identity.
 */
@ApiExcludeController()
@Controller('connections/webhooks')
export class GraphWebhookController {
  constructor(private readonly webhookService: GraphWebhookService) {}

  @Public()
  @Post('graph')
  @HttpCode(200)
  @Header('content-type', 'text/plain')
  ingress(
    @Query('validationToken') validationToken: string | undefined,
    @Body() body: GraphNotificationBody,
    @Res({ passthrough: true }) res: Response,
  ): string {
    // Validation handshake: echo the token verbatim, nothing else.
    if (validationToken) {
      return validationToken;
    }

    // Acknowledge fast; process out of band so a slow refresh can't make Graph
    // retry/disable the subscription.
    void this.webhookService.handleNotifications(body.value ?? []);
    res.status(202);
    return '';
  }
}

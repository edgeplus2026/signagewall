import { Body, Controller, Post, Query, Res } from '@nestjs/common';
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
  ingress(
    @Query('validationToken') validationToken: string | undefined,
    @Body() body: GraphNotificationBody,
    @Res() res: Response,
  ): void {
    // Validation handshake: Graph requires the RAW token as the whole
    // text/plain body. Written straight to the response (non-passthrough
    // @Res) so the global success-envelope interceptor can't wrap it in
    // JSON — wrapped, Graph rejects the subscription.
    if (validationToken) {
      res.status(200).type('text/plain').send(validationToken);
      return;
    }

    // Acknowledge fast; process out of band so a slow refresh can't make Graph
    // retry/disable the subscription.
    void this.webhookService.handleNotifications(body.value ?? []);
    res.status(202).send();
  }
}

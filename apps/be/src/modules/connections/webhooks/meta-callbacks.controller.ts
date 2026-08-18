import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';

import { Public } from '../../../common/decorators/public.decorator';
import { MetaCallbacksService } from './meta-callbacks.service';

/** Meta posts both callbacks as a form-encoded `signed_request`. */
interface SignedRequestBody {
  signed_request?: string;
}

/** Escape a value before it goes into the status page's HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Meta's provider-initiated teardown endpoints, registered on the Meta app as:
 *
 *   Deauthorize Callback URL:  <PUBLIC_API_URL>/api/v1/connections/meta/deauthorize
 *   Data Deletion Request URL: <PUBLIC_API_URL>/api/v1/connections/meta/data-deletion
 *
 * Meta requires both before Facebook Login will run, which is what the Instagram
 * and Facebook Page apps sign in with.
 *
 * `@Public()`: Meta cannot carry our bearer token. Authenticity comes from the
 * `signed_request` HMAC, verified in {@link MetaCallbacksService} before
 * anything is deleted.
 *
 * Both POSTs answer with a RAW body written through `@Res()` rather than a
 * returned object, because the global success-envelope interceptor would
 * otherwise wrap it as `{ success, data }` — and Meta reads `url` /
 * `confirmation_code` off the top level, so a wrapped receipt fails review.
 * The same reason the Graph webhook writes its validation token directly.
 */
@ApiExcludeController()
@Controller('connections/meta')
export class MetaCallbacksController {
  constructor(private readonly metaCallbacks: MetaCallbacksService) {}

  @Public()
  @Post('deauthorize')
  async deauthorize(
    @Body() body: SignedRequestBody,
    @Res() res: Response,
  ): Promise<void> {
    await this.metaCallbacks.handleDeauthorize(body.signed_request ?? '');
    res.status(200).send();
  }

  @Public()
  @Post('data-deletion')
  async dataDeletion(
    @Body() body: SignedRequestBody,
    @Res() res: Response,
  ): Promise<void> {
    const receipt = await this.metaCallbacks.handleDataDeletion(
      body.signed_request ?? '',
    );
    // Exactly the two snake_case keys Meta looks for, at the top level.
    res.status(200).json({
      url: receipt.url,
      confirmation_code: receipt.confirmationCode,
    });
  }

  /**
   * The human-readable status page the receipt's `url` points at.
   *
   * Deletion runs synchronously in the POST above and is finished before the
   * code is ever issued, so there is no pending state to report and nothing left
   * to look the code up against — the page confirms completion and identifies
   * no one, which is also why it is safe to serve to whoever follows the link.
   */
  @Public()
  @Get('data-deletion')
  status(@Query('code') code: string | undefined, @Res() res: Response): void {
    const shown = escapeHtml((code ?? '').slice(0, 64));
    res
      .status(200)
      .type('html')
      .send(
        `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
          `<meta name="viewport" content="width=device-width,initial-scale=1">` +
          `<title>Data deletion — SignageWall</title>` +
          `<style>body{font:16px/1.6 system-ui,sans-serif;margin:0;padding:3rem 1.5rem;` +
          `color:#0F172A;background:#F8FAFC}main{max-width:34rem;margin:0 auto}` +
          `h1{font-size:1.5rem;margin:0 0 1rem}code{background:#E2E8F0;padding:.15em .4em;` +
          `border-radius:.25rem}</style></head><body><main>` +
          `<h1>Your data has been deleted</h1>` +
          `<p>The Facebook and Instagram accounts you had connected to SignageWall have been ` +
          `disconnected, and the access tokens we stored for them have been erased. ` +
          `Any screen app that was using them no longer has access to your account.</p>` +
          (shown ? `<p>Confirmation code: <code>${shown}</code></p>` : '') +
          `<p>Questions? Contact <a href="mailto:support@signagewall.com">support@signagewall.com</a>.</p>` +
          `</main></body></html>`,
      );
  }
}

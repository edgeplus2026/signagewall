import { createHmac, timingSafeEqual } from 'node:crypto';

import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { BusinessException } from '../../../common/exceptions/business.exception';
import { AppInstancesService } from '../../apps/app-instances.service';
import { ConnectionsService } from '../connections.service';
import { ConnectionProvider } from '../schemas/app-connection.schema';

/** The fields we read out of a verified `signed_request` payload. */
interface SignedRequestPayload {
  algorithm?: string;
  user_id?: string;
}

/** What the data-deletion callback must answer Meta with. */
export interface DataDeletionReceipt {
  url: string;
  confirmationCode: string;
}

/** Decode one base64url segment of a `signed_request`. */
function decodeSegment(segment: string): Buffer {
  return Buffer.from(segment, 'base64url');
}

/**
 * Meta's two provider-initiated teardown callbacks (Facebook Login / Instagram).
 *
 * Meta requires both to be registered on the app before Facebook Login can go
 * live, and it exercises them during App Review:
 *
 *  - **Deauthorize** — the person removed SignageWall from their Facebook
 *    settings. Their tokens are dead the moment that happens, so the matching
 *    connections must go too rather than sit around 403-ing on every refresh.
 *  - **Data deletion request** — the person asked Meta for their data to be
 *    erased. Same teardown, plus a receipt Meta shows them.
 *
 * Both arrive UNAUTHENTICATED — no bearer token, no org context — carrying a
 * `signed_request` that is HMAC-signed with the app secret. That signature is
 * the only thing separating a real callback from anyone on the internet POSTing
 * a user id at us, so it is verified before a single document is touched, and a
 * missing app secret is a hard failure rather than a shrug: silently "succeeding"
 * would tell Meta the data is gone when nothing was deleted.
 *
 * The person is identified by app-scoped user id alone, which is why the id is
 * persisted on the connection at connect time
 * ({@link ConnectionsService.findOwnersByProviderAccount}). Teardown goes
 * through {@link AppInstancesService.disconnect} rather than deleting the
 * connection row directly, so each owning instance also loses its
 * `connectionId` and any private mirrored assets — an instance left pointing at
 * a deleted connection renders an error on screen forever.
 *
 * Deletion is SYNCHRONOUS and finished before the receipt is written, so the
 * status page can honestly report completion instead of "pending".
 */
@Injectable()
export class MetaCallbacksService {
  private readonly logger = new Logger(MetaCallbacksService.name);

  constructor(
    private readonly connectionsService: ConnectionsService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => AppInstancesService))
    private readonly appInstancesService: AppInstancesService,
  ) {}

  /**
   * The person removed the app. Tear down every connection made with that
   * Facebook account, in every organization that connected it.
   */
  async handleDeauthorize(signedRequest: string): Promise<void> {
    const userId = this.verify(signedRequest);
    const removed = await this.disconnectAllFor(userId);
    this.logger.log(
      `Meta deauthorize processed: ${removed} connection(s) removed`,
    );
  }

  /**
   * The person asked Meta to delete their data. Same teardown as deauthorize,
   * then a receipt Meta shows them (a status URL + a confirmation code).
   */
  async handleDataDeletion(
    signedRequest: string,
  ): Promise<DataDeletionReceipt> {
    const userId = this.verify(signedRequest);
    const removed = await this.disconnectAllFor(userId);
    this.logger.log(
      `Meta data deletion processed: ${removed} connection(s) removed`,
    );

    const confirmationCode = this.confirmationCode(userId);
    const status = new URL(
      `${this.apiPrefix()}/v1/connections/meta/data-deletion`,
      this.publicApiBase(),
    );
    status.searchParams.set('code', confirmationCode);
    return { url: status.toString(), confirmationCode };
  }

  /**
   * Disconnect every instance connected with this Facebook account.
   *
   * One failure must not strand the rest: a person may have connected the same
   * account in several organizations, and abandoning the sweep half-done would
   * leave live tokens for an account that asked to be forgotten. Failures are
   * logged and rethrown as a whole only if nothing succeeded.
   */
  private async disconnectAllFor(userId: string): Promise<number> {
    const owners = await this.connectionsService.findOwnersByProviderAccount(
      ConnectionProvider.META,
      userId,
    );
    if (owners.length === 0) {
      return 0;
    }

    let removed = 0;
    const failures: unknown[] = [];
    for (const owner of owners) {
      try {
        await this.appInstancesService.disconnect(
          owner.organizationId,
          owner.instanceId,
        );
        removed += 1;
      } catch (error) {
        failures.push(error);
        this.logger.error(
          `Meta teardown failed for instance ${owner.instanceId}: ${String(error)}`,
        );
      }
    }

    if (removed === 0 && failures.length > 0) {
      throw new InternalServerErrorException('Meta account teardown failed.');
    }
    return removed;
  }

  /**
   * Verify the `signed_request` and return the app-scoped user id it names.
   *
   * `timingSafeEqual` needs equal lengths, hence the length check first; a
   * mismatched length is already a rejected signature.
   */
  private verify(signedRequest: string): string {
    const secret = this.configService.get<string>('meta.clientSecret');
    if (!secret) {
      // Unconfigured server: we cannot tell a real Meta callback from a forged
      // one, so we must not act on it and must not claim we did.
      this.logger.error(
        'Meta callback received but META_CLIENT_SECRET is not configured',
      );
      throw new InternalServerErrorException(
        'Meta callbacks are not configured.',
      );
    }

    const [encodedSignature, encodedPayload] = (signedRequest ?? '').split('.');
    if (!encodedSignature || !encodedPayload) {
      throw BusinessException.badRequest('Malformed signed_request.');
    }

    const signature = decodeSegment(encodedSignature);
    const expected = createHmac('sha256', secret)
      .update(encodedPayload)
      .digest();
    if (
      signature.length !== expected.length ||
      !timingSafeEqual(signature, expected)
    ) {
      throw BusinessException.badRequest('Bad signed_request signature.');
    }

    let payload: SignedRequestPayload;
    try {
      payload = JSON.parse(
        decodeSegment(encodedPayload).toString('utf8'),
      ) as SignedRequestPayload;
    } catch {
      throw BusinessException.badRequest('Unreadable signed_request payload.');
    }

    // Meta has only ever signed these with HMAC-SHA256; refuse anything else
    // rather than trust a payload we did not actually verify the way it claims.
    if (
      payload.algorithm &&
      payload.algorithm.toUpperCase() !== 'HMAC-SHA256'
    ) {
      throw BusinessException.badRequest(
        'Unsupported signed_request algorithm.',
      );
    }
    if (!payload.user_id) {
      throw BusinessException.badRequest('signed_request carries no user_id.');
    }
    return payload.user_id;
  }

  /**
   * An opaque receipt for one deletion request. Derived from the app secret so
   * it is stable for a repeated request and reveals nothing about the account —
   * the status page it accompanies identifies no one, because by the time the
   * code exists there is nothing left to look up.
   */
  private confirmationCode(userId: string): string {
    const secret = this.configService.get<string>('meta.clientSecret') ?? '';
    return createHmac('sha256', secret)
      .update(`data-deletion:${userId}`)
      .digest('hex')
      .slice(0, 24);
  }

  private publicApiBase(): string {
    return (
      this.configService.get<string>('publicApiUrl') ??
      `http://localhost:${this.configService.get<number>('port') ?? 3000}`
    ).replace(/\/$/, '');
  }

  private apiPrefix(): string {
    return `/${this.configService.get<string>('apiPrefix') ?? 'api'}`;
  }
}
